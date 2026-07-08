from app.db.models import EvaluationRecord
from app.db.session import SessionLocal
from sqlalchemy import select

from app.schemas.evaluation import EvaluationRecordSummary, EvaluationRequest, EvaluationResponse


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

    def list_recent(self, limit: int = 100) -> list[EvaluationRecordSummary]:
        with SessionLocal() as session:
            records = session.scalars(
                select(EvaluationRecord).order_by(EvaluationRecord.created_at.desc()).limit(limit)
            ).all()
            return [
                EvaluationRecordSummary(
                    id=record.id,
                    user_id=record.user_id,
                    question=record.question,
                    answer=record.answer,
                    score=record.score,
                    hallucination_risk=record.hallucination_risk,
                    notes=record.notes,
                    created_at=record.created_at.isoformat(),
                )
                for record in records
            ]

    def summary(self) -> dict:
        with SessionLocal() as session:
            records = session.scalars(select(EvaluationRecord)).all()
        total = len(records)
        high_risk = sum(1 for record in records if record.hallucination_risk in {"high", "medium"})
        average_score = round(sum(record.score for record in records) / total, 4) if total else 0.0
        return {"total": total, "high_or_medium_risk": high_risk, "average_score": average_score}


evaluation_repository = EvaluationRepository()
