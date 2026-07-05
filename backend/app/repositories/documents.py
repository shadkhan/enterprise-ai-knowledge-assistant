from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.models import DocumentChunkRecord, DocumentRecord
from app.db.session import SessionLocal
from app.schemas.documents import DocumentChunk, DocumentSummary


class DocumentRepository:
    def save_document(self, summary: DocumentSummary, chunks: list[DocumentChunk]) -> None:
        with SessionLocal() as session:
            record = DocumentRecord(
                id=summary.document_id,
                title=summary.title,
                source_type=summary.source_type,
                department=summary.department,
                classification=summary.classification,
                owner_id=summary.owner_id,
                metadata_json=summary.metadata,
                chunks=[
                    DocumentChunkRecord(
                        id=chunk.chunk_id,
                        document_id=summary.document_id,
                        body=chunk.text,
                        metadata_json=summary.metadata,
                    )
                    for chunk in chunks
                ],
            )
            session.add(record)
            session.commit()

    def list_documents(self) -> list[DocumentSummary]:
        with SessionLocal() as session:
            records = session.scalars(select(DocumentRecord).order_by(DocumentRecord.created_at.desc())).all()
            return [self._to_summary(record) for record in records]

    def list_chunks(self) -> list[tuple[DocumentSummary, DocumentChunk]]:
        with SessionLocal() as session:
            records = session.scalars(
                select(DocumentRecord)
                .options(selectinload(DocumentRecord.chunks))
                .order_by(DocumentRecord.created_at.desc())
            ).all()
            pairs: list[tuple[DocumentSummary, DocumentChunk]] = []
            for record in records:
                document = self._to_summary(record)
                pairs.extend(
                    (
                        document,
                        DocumentChunk(
                            chunk_id=chunk.id,
                            document_id=chunk.document_id,
                            text=chunk.body,
                        ),
                    )
                    for chunk in record.chunks
                )
            return pairs

    def count_documents(self) -> int:
        with SessionLocal() as session:
            return len(session.scalars(select(DocumentRecord.id)).all())

    def _to_summary(self, record: DocumentRecord) -> DocumentSummary:
        metadata = record.metadata_json or {}
        return DocumentSummary(
            document_id=record.id,
            title=record.title,
            source_type=record.source_type,
            department=record.department,
            classification=record.classification,
            tags=metadata.get("tags", []),
            owner_id=record.owner_id,
            metadata=metadata,
        )


document_repository = DocumentRepository()
