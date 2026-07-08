from app.core.config import settings
from app.llm.base import LLMProvider
from app.llm.cloud_placeholders import UnconfiguredCloudLLMProvider
from app.llm.mock_provider import MockLLMProvider
from app.llm.openai_compatible_provider import OpenAICompatibleProvider
from app.llm.openai_mock_provider import MockOpenAIProvider
from app.llm.openai_provider import OpenAIProvider


def get_llm_provider(provider_name: str | None = None) -> LLMProvider:
    provider = provider_name or settings.default_llm_provider
    if provider == "mock":
        return MockLLMProvider()
    if provider == "openai_mock":
        return MockOpenAIProvider()
    if provider == "openai":
        return OpenAIProvider()
    if provider == "openai_compatible":
        return OpenAICompatibleProvider()
    if provider in {"vertex", "bedrock"}:
        return UnconfiguredCloudLLMProvider(provider)
    raise ValueError(f"Unsupported LLM provider: {provider}")
