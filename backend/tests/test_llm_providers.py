from app.llm.factory import get_llm_provider
from app.llm.openai_mock_provider import MockOpenAIProvider
from app.llm.openai_provider import OpenAIProvider
from app.routing.model_router import model_router
from app.schemas.retrieval import RetrievedChunk


def _chunk() -> RetrievedChunk:
    return RetrievedChunk(
        document_id="doc-1",
        title="Security Policy",
        chunk_id="chunk-1",
        text="Security reviews are required before production deployment.",
        score=0.91,
        metadata={"department": "Global"},
    )


def test_openai_mock_provider_returns_openai_shaped_answer(monkeypatch) -> None:
    monkeypatch.setattr("app.core.config.settings.openai_mock_latency_ms", 0)
    provider = MockOpenAIProvider()

    result = provider.generate_answer("When are security reviews required?", [_chunk()], "gpt-4o-mini")

    assert "OpenAI-compatible mock answer" in result.answer
    assert result.usage.prompt_tokens > 0
    assert result.usage.completion_tokens > 0


def test_router_uses_openai_models_when_openai_mock_is_selected(monkeypatch) -> None:
    monkeypatch.setattr("app.core.config.settings.default_llm_provider", "openai_mock")

    route = model_router.route("Summarize the security policy", preferred_quality="premium")

    assert route.provider == "openai_mock"
    assert route.model == "gpt-4o"


def test_factory_rejects_unknown_llm_provider() -> None:
    try:
        get_llm_provider("missing")
    except ValueError as exc:
        assert "Unsupported LLM provider" in str(exc)
    else:
        raise AssertionError("Expected ValueError")


def test_openai_provider_falls_back_to_mock_without_api_key(monkeypatch) -> None:
    monkeypatch.setattr("app.core.config.settings.openai_api_key", None)
    monkeypatch.setattr("app.core.config.settings.openai_fallback_to_mock", True)
    monkeypatch.setattr("app.core.config.settings.openai_mock_latency_ms", 0)

    result = OpenAIProvider().generate_answer("When are security reviews required?", [_chunk()], "gpt-4o-mini")

    assert "OpenAI-compatible mock answer" in result.answer
