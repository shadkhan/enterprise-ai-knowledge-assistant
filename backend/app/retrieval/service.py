from app.auth.rbac import User, authorize_document
from app.ingestion.service import ingestion_service
from app.schemas.retrieval import RetrievedChunk


class RetrievalService:
    def search(self, query: str, user: User, top_k: int = 5) -> list[RetrievedChunk]:
        # TODO: Replace with hybrid BM25 + pgvector semantic search and metadata filters.
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


retrieval_service = RetrievalService()

