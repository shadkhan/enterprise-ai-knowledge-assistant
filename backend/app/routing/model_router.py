from pydantic import BaseModel

from app.core.config import settings


class ModelRoute(BaseModel):
    provider: str
    model: str
    reason: str


class ModelRouter:
    def route(self, question: str, preferred_quality: str = "balanced") -> ModelRoute:
        # TODO: Replace rules with telemetry-driven adaptive routing.
        complex_markers = ["compare", "risk", "legal", "policy", "summarize", "multi-step", "architecture"]
        is_complex = len(question.split()) > 40 or any(marker in question.lower() for marker in complex_markers)
        provider = settings.default_llm_provider

        if preferred_quality == "premium" or is_complex:
            return ModelRoute(provider=provider, model=self._premium_model(provider), reason="complex_or_premium")
        return ModelRoute(provider=provider, model=self._cheap_model(provider), reason="simple_query")

    def _cheap_model(self, provider: str) -> str:
        if provider in {"openai", "openai_mock"}:
            return settings.openai_cheap_model
        if provider == "openai_compatible":
            return settings.openai_compatible_cheap_model
        return settings.cheap_model

    def _premium_model(self, provider: str) -> str:
        if provider in {"openai", "openai_mock"}:
            return settings.openai_premium_model
        if provider == "openai_compatible":
            return settings.openai_compatible_premium_model
        return settings.premium_model


model_router = ModelRouter()
