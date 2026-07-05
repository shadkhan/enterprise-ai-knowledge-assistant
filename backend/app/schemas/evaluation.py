from app.schemas.chat import Citation
from pydantic import BaseModel, Field


class EvaluationRequest(BaseModel):
    question: str
    answer: str
    citations: list[Citation] = Field(default_factory=list)


class EvaluationResponse(BaseModel):
    score: float
    hallucination_risk: str
    notes: list[str]
