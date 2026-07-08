from app.core.config import settings
from app.embeddings.base import EmbeddingProvider
from app.embeddings.cloud_placeholders import UnconfiguredCloudEmbeddingProvider
from app.embeddings.huggingface_provider import HuggingFaceEmbeddingProvider
from app.embeddings.mock_provider import MockEmbeddingProvider


def get_embedding_provider(provider_name: str | None = None) -> EmbeddingProvider:
    provider = provider_name or settings.default_embedding_provider
    if provider == "mock":
        return MockEmbeddingProvider()
    if provider == "huggingface":
        return HuggingFaceEmbeddingProvider()
    if provider in {"vertex", "bedrock"}:
        return UnconfiguredCloudEmbeddingProvider(provider)
    raise ValueError(f"Unsupported embedding provider: {provider}")
