from uuid import uuid4

from app.ingestion.chunking import chunk_text
from app.ingestion.metadata import extract_metadata
from app.repositories.documents import document_repository
from app.schemas.documents import DocumentChunk, DocumentCreate, DocumentSummary


class IngestionService:
    def ingest(self, payload: DocumentCreate, owner_id: str) -> list[DocumentSummary]:
        document_id = f"doc-{uuid4().hex[:8]}"
        metadata = extract_metadata(payload)
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
        chunks = chunk_text(document_id, payload.text)
        document_repository.save_document(summary, chunks)
        return [summary]

    def list_documents(self) -> list[DocumentSummary]:
        return document_repository.list_documents()

    def list_chunks(self) -> list[tuple[DocumentSummary, DocumentChunk]]:
        return document_repository.list_chunks()

    def has_documents(self) -> bool:
        return document_repository.count_documents() > 0


ingestion_service = IngestionService()
