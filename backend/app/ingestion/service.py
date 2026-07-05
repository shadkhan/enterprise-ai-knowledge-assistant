from uuid import uuid4

from app.ingestion.chunking import chunk_text
from app.ingestion.metadata import extract_metadata
from app.schemas.documents import DocumentChunk, DocumentCreate, DocumentSummary


class InMemoryKnowledgeStore:
    def __init__(self) -> None:
        self.documents: dict[str, DocumentSummary] = {}
        self.chunks: dict[str, list[DocumentChunk]] = {}


store = InMemoryKnowledgeStore()


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
        store.documents[document_id] = summary
        store.chunks[document_id] = chunks
        return [summary]

    def list_documents(self) -> list[DocumentSummary]:
        return list(store.documents.values())

    def list_chunks(self) -> list[tuple[DocumentSummary, DocumentChunk]]:
        pairs: list[tuple[DocumentSummary, DocumentChunk]] = []
        for document_id, chunks in store.chunks.items():
            document = store.documents[document_id]
            pairs.extend((document, chunk) for chunk in chunks)
        return pairs


ingestion_service = IngestionService()

