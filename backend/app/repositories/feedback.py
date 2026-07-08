from sqlalchemy import select

from app.db.models import FeedbackRecord
from app.db.session import SessionLocal
from app.schemas.feedback import FeedbackCreate, FeedbackRecordSummary, FeedbackSummary


class FeedbackRepository:
    def save(self, user_id: str, payload: FeedbackCreate) -> FeedbackRecordSummary:
        with SessionLocal() as session:
            record = FeedbackRecord(
                user_id=user_id,
                question=payload.question,
                answer=payload.answer,
                rating=payload.rating,
                comment=payload.comment,
                metadata_json={
                    "citations": [citation.model_dump(mode="json") for citation in payload.citations],
                    "model": payload.model,
                    "provider": payload.provider,
                },
            )
            session.add(record)
            session.commit()
            session.refresh(record)
            return self._to_summary(record)

    def list_recent(self, limit: int = 100) -> list[FeedbackRecordSummary]:
        with SessionLocal() as session:
            records = session.scalars(
                select(FeedbackRecord).order_by(FeedbackRecord.created_at.desc()).limit(limit)
            ).all()
            return [self._to_summary(record) for record in records]

    def summary(self) -> FeedbackSummary:
        with SessionLocal() as session:
            records = session.scalars(select(FeedbackRecord)).all()

        positive = sum(1 for record in records if record.rating == "up")
        negative = sum(1 for record in records if record.rating == "down")
        total = len(records)
        return FeedbackSummary(
            total=total,
            positive=positive,
            negative=negative,
            positive_rate=round(positive / total, 4) if total else 0.0,
        )

    def _to_summary(self, record: FeedbackRecord) -> FeedbackRecordSummary:
        return FeedbackRecordSummary(
            id=record.id,
            user_id=record.user_id,
            question=record.question,
            answer=record.answer,
            rating=record.rating,
            comment=record.comment,
            metadata=record.metadata_json or {},
            created_at=record.created_at.isoformat(),
        )


feedback_repository = FeedbackRepository()
