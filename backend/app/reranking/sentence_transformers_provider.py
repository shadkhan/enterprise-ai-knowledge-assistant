from app.core.config import settings
from app.reranking.base import Reranker
from app.schemas.retrieval import RetrievedChunk


class SentenceTransformersReranker(Reranker):
    def __init__(self, model_name: str | None = None) -> None:
        try:
            from sentence_transformers import CrossEncoder
        except ImportError as exc:
            raise RuntimeError(
                "Reranking requires the optional sentence-transformers dependency: "
                "`uv --system-certs sync --group embeddings`."
            ) from exc

        self.model_name = model_name or settings.reranker_model
        self.model = CrossEncoder(self.model_name)

    def rerank(self, query: str, chunks: list[RetrievedChunk], top_n: int) -> list[RetrievedChunk]:
        if not chunks:
            return []

        pairs = [(query, chunk.text) for chunk in chunks]
        scores = self.model.predict(pairs)
        scored = [
            chunk.model_copy(update={"score": round(float(score), 4)})
            for chunk, score in zip(chunks, scores, strict=True)
        ]
        return sorted(scored, key=lambda item: item.score, reverse=True)[:top_n]
