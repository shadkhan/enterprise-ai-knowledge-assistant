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


class EvaluationRecordSummary(BaseModel):
    id: int
    user_id: str
    question: str
    answer: str
    score: float
    hallucination_risk: str
    notes: list[str]
    created_at: str


class GoldenEvaluationCase(BaseModel):
    case_id: str
    question: str
    user_id: str = "u-employee"
    expected_document_title: str | None = None
    forbidden_document_titles: list[str] = Field(default_factory=list)
    minimum_score: float = 0.7


class GoldenEvaluationCaseResult(BaseModel):
    case_id: str
    question: str
    user_id: str
    passed: bool
    score: float
    hallucination_risk: str
    expected_document_found: bool
    forbidden_document_leaked: bool
    citations: list[Citation]
    notes: list[str]


class GoldenEvaluationRunResponse(BaseModel):
    run_id: str
    total_cases: int
    passed_cases: int
    failed_cases: int
    results: list[GoldenEvaluationCaseResult]
