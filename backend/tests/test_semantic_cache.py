from app.auth.rbac import MOCK_USERS
from app.cache.semantic_cache import SemanticCache
from app.schemas.chat import ChatResponse


class FakeRedis:
    def __init__(self) -> None:
        self.store: dict[str, str] = {}

    def set(self, key: str, value: str, ex: int) -> None:
        self.store[key] = value

    def get(self, key: str) -> str | None:
        return self.store.get(key)

    def scan_iter(self, pattern: str):
        prefix = pattern.rstrip("*")
        for key in list(self.store):
            if key.startswith(prefix):
                yield key

    def delete(self, *keys: str) -> None:
        for key in keys:
            self.store.pop(key, None)


def _response() -> ChatResponse:
    return ChatResponse(
        answer="Employees may work remotely two days per week.",
        citations=[],
        model="cheap-fast-model",
        provider="mock",
        latency_ms=10,
        prompt_tokens=20,
        completion_tokens=8,
        estimated_cost_usd=0.001,
        guardrail_flags=[],
    )


def test_semantic_cache_returns_high_similarity_hit(monkeypatch) -> None:
    monkeypatch.setattr("app.core.config.settings.semantic_cache_enabled", True)
    monkeypatch.setattr("app.core.config.settings.semantic_cache_similarity_threshold", 0.9)
    cache = SemanticCache()
    cache.redis = FakeRedis()
    user = MOCK_USERS["u-employee"]

    cache.set("How many remote days?", [1.0, 0.0, 0.0], user, "mock", "cheap-fast-model", 5, _response())
    hit = cache.get("remote work days", [0.98, 0.02, 0.0], user, "mock", "cheap-fast-model", 5)

    assert hit is not None
    assert hit.semantic_cache_hit is True
    assert hit.prompt_tokens == 0
    assert hit.estimated_cost_usd == 0.0


def test_semantic_cache_is_scoped_by_user(monkeypatch) -> None:
    monkeypatch.setattr("app.core.config.settings.semantic_cache_enabled", True)
    cache = SemanticCache()
    cache.redis = FakeRedis()

    cache.set(
        "Restricted answer?",
        [1.0, 0.0, 0.0],
        MOCK_USERS["u-admin"],
        "mock",
        "cheap-fast-model",
        5,
        _response(),
    )
    hit = cache.get(
        "Restricted answer?",
        [1.0, 0.0, 0.0],
        MOCK_USERS["u-employee"],
        "mock",
        "cheap-fast-model",
        5,
    )

    assert hit is None
