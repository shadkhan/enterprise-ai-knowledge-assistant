from uuid import uuid4

from app.cache import retrieval_cache, semantic_cache
from app.embeddings import get_embedding_provider
from app.ingestion.chunking import chunk_llama_document
from app.ingestion.metadata import extract_metadata
from app.ingestion.normalization import to_llama_document
from app.ingestion.synthetic import synthetic_content_factory
from app.repositories.documents import document_repository
from app.schemas.documents import DocumentChunk, DocumentCreate, DocumentSummary, SyntheticContentRequest


class IngestionService:
    def ingest(self, payload: DocumentCreate, owner_id: str, generate_embeddings: bool = True) -> list[DocumentSummary]:
        document_id = f"doc-{uuid4().hex[:8]}"
        metadata = extract_metadata(payload)
        llama_document = to_llama_document(payload, metadata)
        summary = DocumentSummary(
            document_id=document_id,
            title=payload.title,
            source_type=payload.source_type,
            department=payload.department,
            classification=payload.classification,
            tags=payload.tags,
            owner_id=owner_id,
            metadata=metadata,
        )
        chunks = chunk_llama_document(document_id, llama_document)
        if generate_embeddings:
            embeddings = get_embedding_provider().embed_texts([chunk.text for chunk in chunks])
            chunks = [
                DocumentChunk(
                    chunk_id=chunk.chunk_id,
                    document_id=chunk.document_id,
                    text=chunk.text,
                    embedding=embedding,
                )
                for chunk, embedding in zip(chunks, embeddings, strict=True)
            ]
        document_repository.save_document(summary, chunks)
        retrieval_cache.clear()
        semantic_cache.clear()
        return [summary]

    def ingest_synthetic(
        self,
        payload: SyntheticContentRequest,
        owner_id: str,
        generate_embeddings: bool = True,
    ) -> list[DocumentSummary]:
        summaries: list[DocumentSummary] = []
        for document in synthetic_content_factory.build(payload):
            summaries.extend(self.ingest(document, owner_id=owner_id, generate_embeddings=generate_embeddings))
        return summaries

    def list_documents(self) -> list[DocumentSummary]:
        return document_repository.list_documents()

    def list_chunks(self) -> list[tuple[DocumentSummary, DocumentChunk]]:
        return document_repository.list_chunks()

    def has_documents(self) -> bool:
        return document_repository.count_documents() > 0


ingestion_service = IngestionService()
