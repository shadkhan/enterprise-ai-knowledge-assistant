from app.embeddings.base import EmbeddingProvider


class UnconfiguredCloudEmbeddingProvider(EmbeddingProvider):
    def __init__(self, provider_name: str) -> None:
        self.provider_name = provider_name

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        raise RuntimeError(
            f"{self.provider_name} embedding provider is selected, but the cloud adapter is not implemented yet. "
            "Use DEFAULT_EMBEDDING_PROVIDER=mock/huggingface for now, or add the cloud embedding integration."
        )
