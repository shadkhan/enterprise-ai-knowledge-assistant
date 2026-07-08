import time
from typing import List

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, UploadFile

from app.auth.rbac import MOCK_USERS, User, authorize_document, get_mock_user
from app.cache import semantic_cache
from app.core.config import settings
from app.cost.tracker import cost_tracker
from app.embeddings import get_embedding_provider
from app.evaluation.service import evaluator
from app.evaluation.golden_runner import golden_evaluation_runner
from app.ingestion.jobs import ingestion_job_queue
from app.ingestion.file_parsing import parse_uploaded_file
from app.ingestion.service import ingestion_service
from app.llm.factory import get_llm_provider
from app.observability.logging import get_logger
from app.repositories.costs import cost_repository
from app.repositories.conversations import conversation_repository
from app.repositories.documents import document_repository
from app.repositories.evaluations import evaluation_repository
from app.repositories.feedback import feedback_repository
from app.repositories.prompts import prompt_repository
from app.retrieval.service import retrieval_service
from app.routing.model_router import model_router
from app.schemas.admin import (
    AdminDocumentDetail,
    AdminDocumentSummary,
    AdminSettings,
    AuthenticationSettings,
    GovernancePolicy,
    GovernanceSummary,
    UserProfile,
)
from app.schemas.chat import ChatRequest, ChatResponse, Citation
from app.schemas.conversations import CitationPreview, ConversationDetail, ConversationSummary
from app.schemas.documents import (
    DocumentCreate,
    FileIngestionSettings,
    FolderIngestionJobCreate,
    FolderIngestionRequest,
    DocumentSummary,
    IngestionJobCreate,
    IngestionJobStatus,
    SyntheticContentRequest,
    SyntheticIngestionJobCreate,
)
from app.schemas.evaluation import EvaluationRecordSummary, EvaluationRequest, EvaluationResponse, GoldenEvaluationRunResponse
from app.schemas.feedback import FeedbackCreate, FeedbackRecordSummary, FeedbackSummary
from app.schemas.prompts import (
    PromptPreviewRequest,
    PromptPreviewResponse,
    PromptTemplateCreate,
    PromptTemplateSummary,
)
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


@router.get("/admin/documents", response_model=list[AdminDocumentSummary])
def admin_documents(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _: User = Depends(require_admin),
) -> list[AdminDocumentSummary]:
    return [
        _to_admin_document(summary, chunk_count)
        for summary, chunk_count in document_repository.list_admin_documents(limit=limit, offset=offset)
    ]


@router.get("/admin/documents/{document_id}", response_model=AdminDocumentDetail)
def admin_document_detail(document_id: str, _: User = Depends(require_admin)) -> AdminDocumentDetail:
    detail = document_repository.get_document_detail(document_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Document not found")
    summary, chunks = detail
    return AdminDocumentDetail(
        document=_to_admin_document(summary, len(chunks)),
        chunks=[
            {
                "chunk_id": chunk.chunk_id,
                "document_id": chunk.document_id,
                "text": chunk.text,
                "has_embedding": bool(chunk.embedding),
                "embedding_dimensions": len(chunk.embedding or []),
            }
            for chunk in chunks
        ],
    )


@router.get("/admin/ingest/jobs", response_model=list[IngestionJobStatus])
def admin_ingestion_jobs(_: User = Depends(require_admin)) -> list[IngestionJobStatus]:
    return ingestion_job_queue.list_statuses()


@router.get("/admin/evaluations", response_model=list[EvaluationRecordSummary])
def admin_evaluations(_: User = Depends(require_admin)) -> list[EvaluationRecordSummary]:
    return evaluation_repository.list_recent()


@router.post("/admin/evaluations/run", response_model=GoldenEvaluationRunResponse)
def run_admin_evaluations(_: User = Depends(require_admin)) -> GoldenEvaluationRunResponse:
    return golden_evaluation_runner.run()


@router.get("/admin/feedback", response_model=list[FeedbackRecordSummary])
def admin_feedback(_: User = Depends(require_admin)) -> list[FeedbackRecordSummary]:
    return feedback_repository.list_recent()


@router.get("/admin/prompts", response_model=list[PromptTemplateSummary])
def admin_prompts(_: User = Depends(require_admin)) -> list[PromptTemplateSummary]:
    return prompt_repository.list_templates()


@router.post("/admin/prompts", response_model=PromptTemplateSummary)
def create_admin_prompt(payload: PromptTemplateCreate, user: User = Depends(require_admin)) -> PromptTemplateSummary:
    prompt = prompt_repository.create_version(payload, created_by=user.user_id)
    if prompt.status == "active":
        semantic_cache.clear()
    return prompt


@router.post("/admin/prompts/{prompt_id}/activate", response_model=PromptTemplateSummary)
def activate_admin_prompt(prompt_id: int, _: User = Depends(require_admin)) -> PromptTemplateSummary:
    prompt = prompt_repository.activate(prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt template not found")
    semantic_cache.clear()
    return prompt


@router.post("/admin/prompts/{prompt_id}/archive", response_model=PromptTemplateSummary)
def archive_admin_prompt(prompt_id: int, _: User = Depends(require_admin)) -> PromptTemplateSummary:
    prompt = prompt_repository.archive(prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt template not found")
    semantic_cache.clear()
    return prompt


@router.post("/admin/prompts/preview", response_model=PromptPreviewResponse)
def preview_admin_prompt(payload: PromptPreviewRequest, _: User = Depends(require_admin)) -> PromptPreviewResponse:
    try:
        prompt = prompt_repository.get_active(payload.key)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    context_text = "\n\n".join(payload.contexts) or "No authorized context was retrieved."
    return PromptPreviewResponse(
        key=prompt.key,
        version=prompt.version,
        status=prompt.status,
        messages=[
            {"role": "developer", "content": prompt.content},
            {"role": "user", "content": f"Question:\n{payload.question}\n\nAuthorized context:\n{context_text}"},
        ],
    )


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
        reranking_enabled=settings.reranking_enabled,
        reranker_provider=settings.reranker_provider,
        reranker_model=settings.reranker_model,
        reranker_top_n=settings.reranker_top_n,
        reranker_candidate_multiplier=settings.reranker_candidate_multiplier,
        semantic_cache_enabled=settings.semantic_cache_enabled,
        semantic_cache_ttl_seconds=settings.semantic_cache_ttl_seconds,
        semantic_cache_similarity_threshold=settings.semantic_cache_similarity_threshold,
        retrieval_cache_ttl_seconds=settings.retrieval_cache_ttl_seconds,
        ingestion_job_ttl_seconds=settings.ingestion_job_ttl_seconds,
        openai_fallback_to_mock=settings.openai_fallback_to_mock,
    )


@router.get("/admin/ingestion/settings", response_model=FileIngestionSettings)
def admin_ingestion_settings(_: User = Depends(require_admin)) -> FileIngestionSettings:
    return FileIngestionSettings(
        watch_folder=settings.ingestion_watch_folder,
        archive_folder=settings.ingestion_archive_folder,
        allowed_extensions=settings.ingestion_allowed_extensions,
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


@router.post("/ingest/files", response_model=List[DocumentSummary])
async def ingest_files(
    files: list[UploadFile] = File(...),
    department: str = Form(default="Global"),
    classification: str = Form(default="internal"),
    tags: str = Form(default=""),
    generate_embeddings: bool = Form(default=True),
    user: User = Depends(current_user),
) -> List[DocumentSummary]:
    if "admin" not in user.roles and "knowledge_manager" not in user.roles:
        raise HTTPException(status_code=403, detail="File ingestion requires admin or knowledge_manager role")
    if classification not in {"public", "internal", "restricted"}:
        raise HTTPException(status_code=422, detail="classification must be public, internal, or restricted")

    tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
    summaries: list[DocumentSummary] = []
    for upload in files:
        content = await upload.read()
        try:
            parsed = parse_uploaded_file(
                filename=upload.filename or "uploaded-file.txt",
                content=content,
                department=department,
                classification=classification,
                tags=tag_list,
            )
        except (ValueError, UnicodeDecodeError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        summaries.extend(
            ingestion_service.ingest(
                parsed.document,
                owner_id=user.user_id,
                generate_embeddings=generate_embeddings,
            )
        )
    return summaries


@router.post("/ingest/folder", response_model=List[DocumentSummary])
def ingest_folder_now(payload: FolderIngestionRequest, user: User = Depends(current_user)) -> List[DocumentSummary]:
    if "admin" not in user.roles and "knowledge_manager" not in user.roles:
        raise HTTPException(status_code=403, detail="Folder ingestion requires admin or knowledge_manager role")
    try:
        return ingestion_service.ingest_folder(payload, owner_id=user.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/ingest/folder/jobs", response_model=IngestionJobStatus)
def create_folder_ingestion_job(
    payload: FolderIngestionJobCreate,
    user: User = Depends(current_user),
) -> IngestionJobStatus:
    if "admin" not in user.roles and "knowledge_manager" not in user.roles:
        raise HTTPException(status_code=403, detail="Folder ingestion jobs require admin or knowledge_manager role")
    try:
        return ingestion_job_queue.enqueue_folder(payload, owner_id=user.user_id)
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
def list_documents(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(current_user),
) -> List[DocumentSummary]:
    docs = ingestion_service.list_documents(limit=limit, offset=offset)
    return [doc for doc in docs if authorize_document(user, doc)]


@router.get("/documents/chunks/{chunk_id}", response_model=CitationPreview)
def get_document_chunk(chunk_id: str, user: User = Depends(current_user)) -> CitationPreview:
    detail = document_repository.get_chunk(chunk_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Document chunk not found")
    document, chunk = detail
    if not authorize_document(user, document):
        raise HTTPException(status_code=403, detail="Cannot view this citation source")
    return CitationPreview(
        document_id=document.document_id,
        title=document.title,
        chunk_id=chunk.chunk_id,
        text=chunk.text,
        metadata=document.metadata,
    )


@router.get("/chat/sessions", response_model=list[ConversationSummary])
def list_chat_sessions(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(current_user),
) -> list[ConversationSummary]:
    return conversation_repository.list_for_user(user.user_id, limit=limit, offset=offset)


@router.get("/chat/sessions/{conversation_id}", response_model=ConversationDetail)
def get_chat_session(conversation_id: str, user: User = Depends(current_user)) -> ConversationDetail:
    conversation = conversation_repository.get_for_user(conversation_id, user.user_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, user: User = Depends(current_user)) -> ChatResponse:
    started = time.perf_counter()
    risk = guardrails.inspect(payload.question)

    if risk.blocked:
        raise HTTPException(status_code=400, detail=risk.reason)

    sanitized_question = guardrails.redact_pii(payload.question)
    route = model_router.route(sanitized_question, payload.preferred_quality)
    chat_prompt = prompt_repository.get_active("rag_chat_system")
    prompt_scope = f"{chat_prompt.key}:v{chat_prompt.version}"
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
            prompt_scope=prompt_scope,
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
            response = cached_response.model_copy(update={"latency_ms": latency_ms, "guardrail_flags": risk.flags})
            conversation_id = conversation_repository.save_exchange(
                user_id=user.user_id,
                question=sanitized_question,
                response=response,
                conversation_id=payload.conversation_id,
            )
            return response.model_copy(update={"conversation_id": conversation_id})

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
        conversation_id=payload.conversation_id,
        answer=llm_result.answer,
        citations=citations,
        model=route.model,
        provider=route.provider,
        prompt_key=chat_prompt.key,
        prompt_version=chat_prompt.version,
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
            prompt_scope=prompt_scope,
        )
    conversation_id = conversation_repository.save_exchange(
        user_id=user.user_id,
        question=sanitized_question,
        response=response,
        conversation_id=payload.conversation_id,
    )
    return response.model_copy(update={"conversation_id": conversation_id})


def _semantic_cache_embedding(query: str) -> list[float] | None:
    try:
        return get_embedding_provider().embed_texts([query])[0]
    except Exception:
        return None


def _to_admin_document(summary: DocumentSummary, chunk_count: int) -> AdminDocumentSummary:
    return AdminDocumentSummary(
        document_id=summary.document_id,
        title=summary.title,
        source_type=summary.source_type,
        department=summary.department,
        classification=summary.classification,
        tags=summary.tags,
        owner_id=summary.owner_id,
        chunk_count=chunk_count,
        metadata=summary.metadata,
    )


@router.post("/feedback", response_model=FeedbackRecordSummary)
def create_feedback(payload: FeedbackCreate, user: User = Depends(current_user)) -> FeedbackRecordSummary:
    record = feedback_repository.save(user.user_id, payload)
    logger.info(
        "feedback_recorded",
        extra={
            "user_id": user.user_id,
            "rating": payload.rating,
            "model": payload.model,
            "provider": payload.provider,
        },
    )
    return record


@router.get("/metrics/cost")
def cost_metrics(user: User = Depends(current_user)) -> dict:
    if "admin" not in user.roles:
        raise HTTPException(status_code=403, detail="Cost metrics require admin role")
    return cost_repository.summary()


@router.get("/metrics/runtime")
def runtime_metrics(user: User = Depends(current_user)) -> dict:
    if "admin" not in user.roles:
        raise HTTPException(status_code=403, detail="Runtime metrics require admin role")

    jobs = ingestion_job_queue.list_statuses()
    job_counts: dict[str, int] = {}
    for job in jobs:
        job_counts[job.status] = job_counts.get(job.status, 0) + 1

    feedback_summary: FeedbackSummary = feedback_repository.summary()
    return {
        "documents": {
            "count": document_repository.count_documents(),
            "chunk_count": document_repository.count_chunks(),
        },
        "cost": cost_repository.summary(),
        "evaluations": evaluation_repository.summary(),
        "feedback": feedback_summary.model_dump(),
        "ingestion_jobs": {
            "retained": len(jobs),
            "by_status": job_counts,
        },
        "features": {
            "retrieval_mode": settings.retrieval_mode,
            "reranking_enabled": settings.reranking_enabled,
            "reranker_model": settings.reranker_model,
            "semantic_cache_enabled": settings.semantic_cache_enabled,
            "default_llm_provider": settings.default_llm_provider,
            "default_embedding_provider": settings.default_embedding_provider,
            "prompt_library_enabled": True,
            "active_chat_prompt_version": prompt_repository.get_active("rag_chat_system").version,
        },
    }


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
