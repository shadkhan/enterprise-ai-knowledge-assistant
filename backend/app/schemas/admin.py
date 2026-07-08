from pydantic import BaseModel


class UserProfile(BaseModel):
    user_id: str
    name: str
    email: str
    roles: list[str]
    department: str
    clearance: str
    status: str
    auth_provider: str
    last_login: str


class AuthenticationSettings(BaseModel):
    mode: str
    active_provider: str
    session_timeout_minutes: int
    mfa_required_for_admins: bool
    allowed_domains: list[str]
    mock_login_header: str
    planned_providers: list[str]


class AdminSettings(BaseModel):
    default_llm_provider: str
    default_embedding_provider: str
    retrieval_mode: str
    semantic_cache_enabled: bool
    semantic_cache_ttl_seconds: int
    semantic_cache_similarity_threshold: float
    retrieval_cache_ttl_seconds: int
    ingestion_job_ttl_seconds: int
    openai_fallback_to_mock: bool


class GovernancePolicy(BaseModel):
    policy_id: str
    name: str
    category: str
    status: str
    enforcement: str
    owner: str
    description: str


class GovernanceSummary(BaseModel):
    policies: list[GovernancePolicy]
    audit_events_retention_days: int
    data_classifications: list[str]
    approval_required_for: list[str]
