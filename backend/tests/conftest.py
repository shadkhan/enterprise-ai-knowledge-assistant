import pytest


@pytest.fixture(autouse=True)
def use_mock_runtime_providers(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.default_llm_provider", "mock")
    monkeypatch.setattr("app.core.config.settings.default_embedding_provider", "mock")
    monkeypatch.setattr("app.core.config.settings.openai_api_key", None)
