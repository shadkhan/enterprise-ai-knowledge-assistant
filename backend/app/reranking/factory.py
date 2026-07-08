from app.core.config import settings
from app.reranking.base import Reranker
from app.reranking.sentence_transformers_provider import SentenceTransformersReranker


def get_reranker(provider_name: str | None = None) -> Reranker:
    provider = provider_name or settings.reranker_provider
    if provider == "sentence_transformers":
        return SentenceTransformersReranker()
    raise ValueError(f"Unsupported reranker provider: {provider}")
