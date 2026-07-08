import time
from typing import List

from fastapi import APIRouter, Depends, Header, HTTPException

from app.auth.rbac import MOCK_USERS, User, authorize_document, get_mock_user
from app.cache import semantic_cache
from app.core.config import settings
from app.cost.tracker import cost_tracker
from app.embeddings import get_embedding_provider
from app.evaluation.service import evaluator
from app.ingestion.jobs import ingestion_job_queue
from app.ingestion.service import ingestion_service
from app.llm.factory import get_llm_provider
from app.observability.logging import get_logger
from app.repositories.costs import cost_repository
from app.repositories.evaluations import evaluation_repository
from app.retrieval.service import retrieval_service
from app.routing.model_router import model_router
from app.schemas.admin import AdminSettings, AuthenticationSettings, GovernancePolicy, GovernanceSummary, UserProfile
from app.schemas.chat import ChatRequest, ChatResponse, Citation
from app.schemas.documents import (
    DocumentCreate,
    DocumentSummary,
    IngestionJobCreate,
    IngestionJobStatus,
    SyntheticContentRequest,
    SyntheticIngestionJobCreate,
)
from app.schemas.evaluation import EvaluationRequest, EvaluationResponse
from app.security.guardrails import guardrails

router = APIRouter()
logger = get_logger(__name__)


def current_user(x_user_id: str = Header(default="u-employee")) -> User:
    user = get_mock_user(x_user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unknown mock user")
    return user


def require_admin(user: User = Depends(current_user)) -> User:
    if "admin" not in user.roles:
        raise HTTPException(status_code=403, detail="Admin role required")
    return user


def _to_user_profile(user: User) -> UserProfile:
    return UserProfile(
        user_id=user.user_id,
        name=user.name,
        email=user.email,
        roles=user.roles,
        department=user.department,
        clearance=user.clearance,
        status=user.status,
        auth_provider=user.auth_provider,
        last_login=user.last_login,
    )


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "enterprise-ai-knowledge-assistant"}


@router.get("/auth/me", response_model=UserProfile)
def auth_me(user: User = Depends(current_user)) -> UserProfile:
    return _to_user_profile(user)


@router.get("/admin/users", response_model=list[UserProfile])
def admin_users(_: User = Depends(require_admin)) -> list[UserProfile]:
    return [_to_user_profile(user) for user in MOCK_USERS.values()]


@router.get("/admin/authentication", response_model=AuthenticationSettings)
def admin_authentication(_: User = Depends(require_admin)) -> AuthenticationSettings:
    return AuthenticationSettings(
        mode="mock-header-auth",
        active_provider="Mock SSO",
        session_timeout_minutes=60,
        mfa_required_for_admins=True,
        allowed_domains=["example.com"],
        mock_login_header="X-User-Id",
        planned_providers=["OIDC", "SAML", "Azure AD", "Okta"],
    )


@router.get("/admin/settings", response_model=AdminSettings)
def admin_settings(_: User = Depends(require_admin)) -> AdminSettings:
    return AdminSettings(
        default_llm_provider=settings.default_llm_provider,
        default_embedding_provider=settings.default_embedding_provider,
        retrieval_mode=settings.retrieval_mode,
        semantic_cache_enabled=settings.semantic_cache_enabled,
        semantic_cache_ttl_seconds=settings.semantic_cache_ttl_seconds,
        semantic_cache_similarity_threshold=settings.semantic_cache_similarity_threshold,
        retrieval_cache_ttl_seconds=settings.retrieval_cache_ttl_seconds,
        ingestion_job_ttl_seconds=settings.ingestion_job_ttl_seconds,
        openai_fallback_to_mock=settings.openai_fallback_to_mock,
    )


@router.get("/admin/governance", response_model=GovernanceSummary)
def admin_governance(_: User = Depends(require_admin)) -> GovernanceSummary:
    return GovernanceSummary(
        audit_events_retention_days=365,
        data_classifications=["public", "internal", "restricted"],
        approval_required_for=["restricted ingestion", "provider changes", "budget limit changes"],
        policies=[
            GovernancePolicy(
                policy_id="gov-rbac",
                name="Permission-aware retrieval",
                category="Access Control",
                status="active",
                enforcement="pre-retrieval filter",
                owner="Security",
                description="Documents are filtered by role, department, and clearance before context reaches the LLM.",
            ),
            GovernancePolicy(
                policy_id="gov-cache",
                name="Semantic cache isolation",
                category="Cost Control",
                status="active",
                enforcement="user/provider/model scoped cache keys",
                owner="Platform",
                description="Cached answers are reused only inside the same permission and routing scope.",
            ),
            GovernancePolicy(
                policy_id="gov-pii",
                name="PII redaction placeholder",
                category="Data Protection",
                status="prototype",
                enforcement="prompt inspection",
                owner="Compliance",
                description="Simple prompt checks demonstrate where enterprise DLP and policy engines will integrate.",
            ),
            GovernancePolicy(
                policy_id="gov-audit",
                name="Audit logging",
                category="Observability",
                status="planned",
                enforcement="persistent sensitive-access events",
                owner="IT",
                description="Future immutable audit events will track sensitive document access and admin changes.",
            ),
        ],
    )


@router.post("/ingest", response_model=List[DocumentSummary])
def ingest_documents(
    payload: DocumentCreate,
    user: User = Depends(current_user),
) -> List[DocumentSummary]:
    if "admin" not in user.roles and "knowledge_manager" not in user.roles:
        raise HTTPException(status_code=403, detail="Ingestion requires admin or knowledge_manager role")

    docs = ingestion_service.ingest(payload, owner_id=user.user_id)
    logger.info(
        "documents_ingested",
        extra={
            "user_id": user.user_id,
            "document_count": len(docs),
            "department": payload.department,
        },
    )
    return docs


@router.post("/synthetic/documents", response_model=List[DocumentSummary])
def ingest_synthetic_documents(
    payload: SyntheticContentRequest,
    user: User = Depends(current_user),
) -> List[DocumentSummary]:
    if "admin" not in user.roles and "knowledge_manager" not in user.roles:
        raise HTTPException(status_code=403, detail="Synthetic ingestion requires admin or knowledge_manager role")

    docs = ingestion_service.ingest_synthetic(payload, owner_id=user.user_id)
    logger.info(
        "synthetic_documents_ingested",
        extra={
            "user_id": user.user_id,
            "document_count": len(docs),
            "content_type": payload.content_type,
            "department": payload.department,
        },
    )
    return docs


@router.post("/ingest/jobs", response_model=IngestionJobStatus)
def create_ingestion_job(
    payload: IngestionJobCreate,
    user: User = Depends(current_user),
) -> IngestionJobStatus:
    if "admin" not in user.roles and "knowledge_manager" not in user.roles:
        raise HTTPException(status_code=403, detail="Ingestion jobs require admin or knowledge_manager role")
    try:
        return ingestion_job_queue.enqueue_document(payload, owner_id=user.user_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/synthetic/jobs", response_model=IngestionJobStatus)
def create_synthetic_ingestion_job(
    payload: SyntheticIngestionJobCreate,
    user: User = Depends(current_user),
) -> IngestionJobStatus:
    if "admin" not in user.roles and "knowledge_manager" not in user.roles:
        raise HTTPException(status_code=403, detail="Synthetic ingestion jobs require admin or knowledge_manager role")
    try:
        return ingestion_job_queue.enqueue_synthetic(payload, owner_id=user.user_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/ingest/jobs/{job_id}", response_model=IngestionJobStatus)
def get_ingestion_job(job_id: str, user: User = Depends(current_user)) -> IngestionJobStatus:
    status = ingestion_job_queue.get_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Ingestion job not found")
    if "admin" not in user.roles and status.owner_id != user.user_id:
        raise HTTPException(status_code=403, detail="Cannot view another user's ingestion job")
    return status


@router.get("/documents", response_model=List[DocumentSummary])
def list_documents(user: User = Depends(current_user)) -> List[DocumentSummary]:
    docs = ingestion_service.list_documents()
    return [doc for doc in docs if authorize_document(user, doc)]


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, user: User = Depends(current_user)) -> ChatResponse:
    started = time.perf_counter()
    risk = guardrails.inspect(payload.question)

    if risk.blocked:
        raise HTTPException(status_code=400, detail=risk.reason)

    sanitized_question = guardrails.redact_pii(payload.question)
    route = model_router.route(sanitized_question, payload.preferred_quality)
    retrieved = retrieval_service.search(
        query=sanitized_question,
        user=user,
        top_k=payload.top_k,
    )
    query_embedding = _semantic_cache_embedding(sanitized_question)
    if query_embedding is not None:
        cached_response = semantic_cache.get(
            query=sanitized_question,
            embedding=query_embedding,
            user=user,
            provider=route.provider,
            model=route.model,
            top_k=payload.top_k,
        )
        if cached_response is not None:
            latency_ms = round((time.perf_counter() - started) * 1000, 2)
            logger.info(
                "chat_semantic_cache_hit",
                extra={
                    "user_id": user.user_id,
                    "model": route.model,
                    "provider": route.provider,
                    "latency_ms": latency_ms,
                    "semantic_cache_score": cached_response.semantic_cache_score,
                },
            )
            return cached_response.model_copy(update={"latency_ms": latency_ms, "guardrail_flags": risk.flags})

    provider = get_llm_provider(route.provider)
    llm_result = provider.generate_answer(
        question=sanitized_question,
        contexts=retrieved,
        model=route.model,
    )

    latency_ms = round((time.perf_counter() - started) * 1000, 2)
    usage = cost_tracker.record(
        user_id=user.user_id,
        provider=route.provider,
        model=route.model,
        prompt_tokens=llm_result.usage.prompt_tokens,
        completion_tokens=llm_result.usage.completion_tokens,
        latency_ms=latency_ms,
    )
    cost_repository.save(usage)

    citations = [
        Citation(
            document_id=item.document_id,
            title=item.title,
            chunk_id=item.chunk_id,
            score=item.score,
        )
        for item in retrieved
    ]

    logger.info(
        "chat_completed",
        extra={
            "user_id": user.user_id,
            "model": route.model,
            "provider": route.provider,
            "latency_ms": latency_ms,
            "estimated_cost_usd": usage.estimated_cost_usd,
            "citations": len(citations),
        },
    )

    response = ChatResponse(
        answer=llm_result.answer,
        citations=citations,
        model=route.model,
        provider=route.provider,
        latency_ms=latency_ms,
        prompt_tokens=usage.prompt_tokens,
        completion_tokens=usage.completion_tokens,
        estimated_cost_usd=usage.estimated_cost_usd,
        guardrail_flags=risk.flags,
    )
    if query_embedding is not None:
        semantic_cache.set(
            query=sanitized_question,
            embedding=query_embedding,
            user=user,
            provider=route.provider,
            model=route.model,
            top_k=payload.top_k,
            response=response,
        )
    return response


def _semantic_cache_embedding(query: str) -> list[float] | None:
    try:
        return get_embedding_provider().embed_texts([query])[0]
    except Exception:
        return None


@router.get("/metrics/cost")
def cost_metrics(user: User = Depends(current_user)) -> dict:
    if "admin" not in user.roles:
        raise HTTPException(status_code=403, detail="Cost metrics require admin role")
    return cost_repository.summary()


@router.post("/evaluate", response_model=EvaluationResponse)
def evaluate(payload: EvaluationRequest, user: User = Depends(current_user)) -> EvaluationResponse:
    result = evaluator.evaluate(payload)
    evaluation_repository.save(user.user_id, payload, result)
    logger.info(
        "answer_evaluated",
        extra={
            "user_id": user.user_id,
            "score": result.score,
            "hallucination_risk": result.hallucination_risk,
        },
    )
    return result
