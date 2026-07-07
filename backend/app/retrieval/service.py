from app.cache import retrieval_cache
from app.auth.rbac import User, authorize_document
from app.core.config import settings
from app.embeddings import get_embedding_provider
from app.ingestion.service import ingestion_service
from app.repositories.documents import document_repository
from app.schemas.retrieval import RetrievedChunk


class RetrievalService:
    def search(self, query: str, user: User, top_k: int = 5) -> list[RetrievedChunk]:
        cached = retrieval_cache.get(query, user, top_k)
        if cached is not None:
            return cached

        lexical_results = self._lexical_search(query, user, top_k=top_k * 2)
        vector_results: list[RetrievedChunk] = []
        if settings.retrieval_mode in {"vector", "hybrid"}:
            query_embedding = get_embedding_provider().embed_texts([query])[0]
            vector_results = document_repository.vector_search(query_embedding, user, top_k=top_k * 2)

        if settings.retrieval_mode == "vector":
            ranked = vector_results[:top_k]
        elif settings.retrieval_mode == "hybrid":
            ranked = self._hybrid_rank(lexical_results, vector_results, top_k)
        else:
            ranked = lexical_results[:top_k]

        retrieval_cache.set(query, user, top_k, ranked)
        return ranked

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
