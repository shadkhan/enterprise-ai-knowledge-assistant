from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1)
    preferred_quality: str = Field(default="balanced", pattern="^(cheap|balanced|premium)$")
    top_k: int = Field(default=5, ge=1, le=10)
    conversation_id: str | None = None


class Citation(BaseModel):
    document_id: str
    title: str
    chunk_id: str
    score: float


class ChatResponse(BaseModel):
    conversation_id: str | None = None
    answer: str
    citations: list[Citation]
    model: str
    provider: str
    prompt_key: str = "rag_chat_system"
    prompt_version: int = 1
    latency_ms: float
    prompt_tokens: int
    completion_tokens: int
    estimated_cost_usd: float
    guardrail_flags: list[str]
    semantic_cache_hit: bool = False
    semantic_cache_score: float | None = None
    semantic_cache_source_question: str | None = None
