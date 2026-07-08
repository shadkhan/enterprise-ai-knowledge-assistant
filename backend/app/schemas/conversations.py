from pydantic import BaseModel

from app.schemas.chat import Citation


class ConversationMessageSummary(BaseModel):
    id: int
    role: str
    content: str
    metadata: dict
    created_at: str


class ConversationSummary(BaseModel):
    conversation_id: str
    title: str
    user_id: str
    created_at: str
    updated_at: str
    latest_message: str | None = None


class ConversationDetail(ConversationSummary):
    messages: list[ConversationMessageSummary]


class CitationPreview(BaseModel):
    document_id: str
    title: str
    chunk_id: str
    text: str
    score: float | None = None
    metadata: dict
    citations: list[Citation] = []
