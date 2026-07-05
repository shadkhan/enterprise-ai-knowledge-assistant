from app.db.models import EvaluationRecord
from app.db.session import SessionLocal
from app.schemas.evaluation import EvaluationRequest, EvaluationResponse


class EvaluationRepository:
    def save(self, user_id: str, payload: EvaluationRequest, result: EvaluationResponse) -> None:
        with SessionLocal() as session:
            session.add(
                EvaluationRecord(
                    user_id=user_id,
                    question=payload.question,
                    answer=payload.answer,
                    score=result.score,
                    hallucination_risk=result.hallucination_risk,
                    notes=result.notes,
                )
            )
            session.commit()


evaluation_repository = EvaluationRepository()
