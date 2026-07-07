import hashlib
import math

from app.embeddings.base import EmbeddingProvider
from app.core.config import settings


class MockEmbeddingProvider(EmbeddingProvider):
    dimensions = settings.embedding_dimensions

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        return [self._embed(text) for text in texts]

    def _embed(self, text: str) -> list[float]:
        seed = hashlib.sha256(text.encode("utf-8")).digest()
        digest = b"".join(hashlib.sha256(seed + bytes([index % 256])).digest() for index in range((self.dimensions // 32) + 1))
        raw = [(digest[index] / 255.0) - 0.5 for index in range(self.dimensions)]
        norm = math.sqrt(sum(value * value for value in raw)) or 1.0
        return [round(value / norm, 6) for value in raw]
