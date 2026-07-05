from pydantic import BaseModel


class ModelRoute(BaseModel):
    provider: str
    model: str
    reason: str


class ModelRouter:
    def route(self, question: str, preferred_quality: str = "balanced") -> ModelRoute:
        # TODO: Replace rules with telemetry-driven adaptive routing.
        complex_markers = ["compare", "risk", "legal", "policy", "summarize", "multi-step", "architecture"]
        is_complex = len(question.split()) > 40 or any(marker in question.lower() for marker in complex_markers)

        if preferred_quality == "premium" or is_complex:
            return ModelRoute(provider="mock", model="premium-reasoning-model", reason="complex_or_premium")
        return ModelRoute(provider="mock", model="cheap-fast-model", reason="simple_query")


model_router = ModelRouter()

