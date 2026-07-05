from pydantic import BaseModel


class UsageRecord(BaseModel):
    user_id: str
    provider: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    latency_ms: float
    estimated_cost_usd: float


class CostTracker:
    PRICES_PER_1K = {
        "cheap-fast-model": 0.0002,
        "premium-reasoning-model": 0.002,
    }

    def __init__(self) -> None:
        self.records: list[UsageRecord] = []

    def record(
        self,
        user_id: str,
        provider: str,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
        latency_ms: float,
    ) -> UsageRecord:
        total_tokens = prompt_tokens + completion_tokens
        estimated_cost = round((total_tokens / 1000) * self.PRICES_PER_1K.get(model, 0.001), 6)
        record = UsageRecord(
            user_id=user_id,
            provider=provider,
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            latency_ms=latency_ms,
            estimated_cost_usd=estimated_cost,
        )
        self.records.append(record)
        return record

    def summary(self) -> dict:
        return {
            "request_count": len(self.records),
            "total_tokens": sum(record.total_tokens for record in self.records),
            "estimated_cost_usd": round(sum(record.estimated_cost_usd for record in self.records), 6),
            "by_model": self._by_model(),
        }

    def _by_model(self) -> dict:
        summary: dict[str, dict] = {}
        for record in self.records:
            model_summary = summary.setdefault(record.model, {"requests": 0, "tokens": 0, "cost_usd": 0.0})
            model_summary["requests"] += 1
            model_summary["tokens"] += record.total_tokens
            model_summary["cost_usd"] = round(model_summary["cost_usd"] + record.estimated_cost_usd, 6)
        return summary


cost_tracker = CostTracker()

