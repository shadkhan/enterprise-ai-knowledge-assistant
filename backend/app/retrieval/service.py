from app.cache import retrieval_cache
from app.auth.rbac import User, authorize_document
from app.core.config import settings
from app.embeddings import get_embedding_provider
from app.ingestion.service import ingestion_service
from app.repositories.documents import document_repository
from app.reranking import get_reranker
from app.observability.logging import get_logger
from app.schemas.retrieval import RetrievedChunk

logger = get_logger(__name__)


class RetrievalService:
    def search(self, query: str, user: User, top_k: int = 5) -> list[RetrievedChunk]:
        cached = retrieval_cache.get(query, user, top_k)
        if cached is not None:
            return cached

        candidate_limit = self._candidate_limit(top_k)
        lexical_results = self._lexical_search(query, user, top_k=candidate_limit)
        vector_results: list[RetrievedChunk] = []
        if settings.retrieval_mode in {"vector", "hybrid"}:
            query_embedding = get_embedding_provider().embed_texts([query])[0]
            vector_results = document_repository.vector_search(query_embedding, user, top_k=candidate_limit)

        if settings.retrieval_mode == "vector":
            candidates = vector_results[:candidate_limit]
        elif settings.retrieval_mode == "hybrid":
            candidates = self._hybrid_rank(lexical_results, vector_results, candidate_limit)
        else:
            candidates = lexical_results[:candidate_limit]

        ranked = self._rerank(query, candidates, top_k)

        retrieval_cache.set(query, user, top_k, ranked)
        return ranked

    def _candidate_limit(self, top_k: int) -> int:
        if not settings.reranking_enabled:
            return top_k * 2
        return max(top_k, top_k * settings.reranker_candidate_multiplier)

    def _rerank(self, query: str, candidates: list[RetrievedChunk], top_k: int) -> list[RetrievedChunk]:
        if not settings.reranking_enabled or not candidates:
            return candidates[:top_k]

        top_n = min(max(settings.reranker_top_n, top_k), len(candidates))
        try:
            reranked = get_reranker().rerank(query, candidates, top_n=top_n)
            logger.info(
                "retrieval_reranked",
                extra={
                    "reranker_provider": settings.reranker_provider,
                    "reranker_model": settings.reranker_model,
                    "candidate_count": len(candidates),
                    "returned_count": min(top_k, len(reranked)),
                },
            )
            return reranked[:top_k]
        except Exception as exc:
            logger.warning(
                "retrieval_rerank_failed",
                extra={
                    "reranker_provider": settings.reranker_provider,
                    "reranker_model": settings.reranker_model,
                    "error": str(exc),
                },
            )
            return candidates[:top_k]

    def _lexical_search(self, query: str, user: User, top_k: int) -> list[RetrievedChunk]:
        query_terms = {term.lower().strip(".,!?") for term in query.split() if len(term) > 2}
        results: list[RetrievedChunk] = []

        for document, chunk in ingestion_service.list_chunks():
            if not authorize_document(user, document):
                continue

            chunk_terms = {term.lower().strip(".,!?") for term in chunk.text.split()}
            overlap = len(query_terms.intersection(chunk_terms))
            score = overlap / max(len(query_terms), 1)
            if score > 0 or not query_terms:
                results.append(
                    RetrievedChunk(
                        document_id=document.document_id,
                        title=document.title,
                        chunk_id=chunk.chunk_id,
                        text=chunk.text,
                        score=round(score, 4),
                        metadata=document.metadata,
                    )
                )

        return sorted(results, key=lambda item: item.score, reverse=True)[:top_k]

    def _hybrid_rank(
        self,
        lexical_results: list[RetrievedChunk],
        vector_results: list[RetrievedChunk],
        top_k: int,
    ) -> list[RetrievedChunk]:
        merged: dict[str, RetrievedChunk] = {}
        scores: dict[str, float] = {}

        for item in lexical_results:
            merged[item.chunk_id] = item
            scores[item.chunk_id] = scores.get(item.chunk_id, 0.0) + (settings.lexical_weight * item.score)

        for item in vector_results:
            merged[item.chunk_id] = item
            scores[item.chunk_id] = scores.get(item.chunk_id, 0.0) + (settings.vector_weight * max(item.score, 0.0))

        ranked: list[RetrievedChunk] = []
        for chunk_id, score in sorted(scores.items(), key=lambda pair: pair[1], reverse=True)[:top_k]:
            item = merged[chunk_id]
            ranked.append(item.model_copy(update={"score": round(score, 4)}))
        return ranked


retrieval_service = RetrievalService()
