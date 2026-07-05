from sqlalchemy import select

from app.db.models import CostRecord
from app.db.session import SessionLocal
from app.cost.tracker import UsageRecord


class CostRepository:
    def save(self, record: UsageRecord) -> None:
        with SessionLocal() as session:
            session.add(
                CostRecord(
                    user_id=record.user_id,
                    provider=record.provider,
                    model=record.model,
                    prompt_tokens=record.prompt_tokens,
                    completion_tokens=record.completion_tokens,
                    total_tokens=record.total_tokens,
                    latency_ms=record.latency_ms,
                    estimated_cost_usd=record.estimated_cost_usd,
                )
            )
            session.commit()

    def summary(self) -> dict:
        with SessionLocal() as session:
            records = session.scalars(select(CostRecord)).all()

        by_model: dict[str, dict] = {}
        for record in records:
            model_summary = by_model.setdefault(record.model, {"requests": 0, "tokens": 0, "cost_usd": 0.0})
            model_summary["requests"] += 1
            model_summary["tokens"] += record.total_tokens
            model_summary["cost_usd"] = round(model_summary["cost_usd"] + record.estimated_cost_usd, 6)

        return {
            "request_count": len(records),
            "total_tokens": sum(record.total_tokens for record in records),
            "estimated_cost_usd": round(sum(record.estimated_cost_usd for record in records), 6),
            "by_model": by_model,
        }


cost_repository = CostRepository()
