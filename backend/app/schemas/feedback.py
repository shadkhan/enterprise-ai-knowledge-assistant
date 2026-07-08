from pydantic import BaseModel, Field

from app.schemas.chat import Citation


class FeedbackCreate(BaseModel):
    question: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)
    rating: str = Field(..., pattern="^(up|down)$")
    comment: str | None = None
    citations: list[Citation] = Field(default_factory=list)
    model: str | None = None
    provider: str | None = None


class FeedbackRecordSummary(BaseModel):
    id: int
    user_id: str
    question: str
    answer: str
    rating: str
    comment: str | None
    metadata: dict
    created_at: str


class FeedbackSummary(BaseModel):
    total: int
    positive: int
    negative: int
    positive_rate: float
