from app.core.config import settings
from app.llm.base import LLMProvider
from app.llm.mock_provider import MockLLMProvider
from app.llm.openai_provider import OpenAIProvider


def get_llm_provider(provider_name: str | None = None) -> LLMProvider:
    provider = provider_name or settings.default_llm_provider
    if provider == "openai":
        return OpenAIProvider()
    return MockLLMProvider()

