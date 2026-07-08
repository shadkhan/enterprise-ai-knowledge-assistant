from sqlalchemy import select, text
from sqlalchemy.orm import selectinload

from app.auth.rbac import User
from app.core.config import settings
from app.db.models import DocumentChunkRecord, DocumentRecord
from app.db.session import SessionLocal, is_postgres
from app.schemas.retrieval import RetrievedChunk
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
                        metadata_json={**summary.metadata, "embedding": chunk.embedding} if chunk.embedding else summary.metadata,
                    )
                    for chunk in chunks
                ],
            )
            session.add(record)
            session.flush()
            if is_postgres:
                self._store_pgvector_embeddings(session, chunks)
            session.commit()

    def list_documents(self, limit: int | None = None, offset: int = 0) -> list[DocumentSummary]:
        with SessionLocal() as session:
            statement = select(DocumentRecord).order_by(DocumentRecord.created_at.desc()).offset(offset)
            if limit is not None:
                statement = statement.limit(limit)
            records = session.scalars(statement).all()
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
                            embedding=(chunk.metadata_json or {}).get("embedding"),
                        ),
                    )
                    for chunk in record.chunks
                )
            return pairs

    def list_admin_documents(self, limit: int | None = None, offset: int = 0) -> list[tuple[DocumentSummary, int]]:
        with SessionLocal() as session:
            statement = (
                select(DocumentRecord)
                .options(selectinload(DocumentRecord.chunks))
                .order_by(DocumentRecord.created_at.desc())
                .offset(offset)
            )
            if limit is not None:
                statement = statement.limit(limit)
            records = session.scalars(statement).all()
            return [(self._to_summary(record), len(record.chunks)) for record in records]

    def get_document_detail(self, document_id: str) -> tuple[DocumentSummary, list[DocumentChunk]] | None:
        with SessionLocal() as session:
            record = session.scalar(
                select(DocumentRecord).options(selectinload(DocumentRecord.chunks)).where(DocumentRecord.id == document_id)
            )
            if not record:
                return None
            return (
                self._to_summary(record),
                [
                    DocumentChunk(
                        chunk_id=chunk.id,
                        document_id=chunk.document_id,
                        text=chunk.body,
                        embedding=(chunk.metadata_json or {}).get("embedding"),
                    )
                    for chunk in record.chunks
                ],
            )

    def get_chunk(self, chunk_id: str) -> tuple[DocumentSummary, DocumentChunk] | None:
        with SessionLocal() as session:
            chunk = session.scalar(
                select(DocumentChunkRecord)
                .options(selectinload(DocumentChunkRecord.document))
                .where(DocumentChunkRecord.id == chunk_id)
            )
            if not chunk:
                return None
            return (
                self._to_summary(chunk.document),
                DocumentChunk(
                    chunk_id=chunk.id,
                    document_id=chunk.document_id,
                    text=chunk.body,
                    embedding=(chunk.metadata_json or {}).get("embedding"),
                ),
            )

    def vector_search(self, query_embedding: list[float], user: User, top_k: int) -> list[RetrievedChunk]:
        if not is_postgres or len(query_embedding) != self._pgvector_dimensions():
            return self._metadata_vector_search(query_embedding, user, top_k)

        embedding_literal = self._vector_literal(query_embedding)
        with SessionLocal() as session:
            rows = session.execute(
                text(
                    """
                    SELECT
                        d.id AS document_id,
                        d.title AS title,
                        c.id AS chunk_id,
                        c.body AS body,
                        c.metadata AS metadata,
                        1 - (c.embedding <=> CAST(:embedding AS vector)) AS score
                    FROM document_chunks c
                    JOIN documents d ON d.id = c.document_id
                    WHERE c.embedding IS NOT NULL
                      AND (:is_admin OR d.department = :department OR d.department = 'Global')
                      AND (
                        CASE d.classification
                          WHEN 'public' THEN 0
                          WHEN 'internal' THEN 1
                          WHEN 'restricted' THEN 2
                          ELSE 99
                        END
                      ) <= :clearance_rank
                    ORDER BY c.embedding <=> CAST(:embedding AS vector)
                    LIMIT :top_k
                    """
                ),
                {
                    "embedding": embedding_literal,
                    "is_admin": "admin" in user.roles,
                    "department": user.department,
                    "clearance_rank": {"public": 0, "internal": 1, "restricted": 2}[user.clearance],
                    "top_k": top_k,
                },
            ).mappings()

            return [
                RetrievedChunk(
                    document_id=row["document_id"],
                    title=row["title"],
                    chunk_id=row["chunk_id"],
                    text=row["body"],
                    score=round(float(row["score"] or 0.0), 4),
                    metadata=row["metadata"] or {},
                )
                for row in rows
            ]

    def _metadata_vector_search(self, query_embedding: list[float], user: User, top_k: int) -> list[RetrievedChunk]:
        from app.auth.rbac import authorize_document

        results: list[RetrievedChunk] = []
        for document, chunk in self.list_chunks():
            if not authorize_document(user, document) or not chunk.embedding:
                continue
            score = self._cosine_similarity(query_embedding, chunk.embedding)
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

    def count_documents(self) -> int:
        with SessionLocal() as session:
            return len(session.scalars(select(DocumentRecord.id)).all())

    def count_chunks(self) -> int:
        with SessionLocal() as session:
            return len(session.scalars(select(DocumentChunkRecord.id)).all())

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

    def _store_pgvector_embeddings(self, session, chunks: list[DocumentChunk]) -> None:
        for chunk in chunks:
            if not chunk.embedding:
                continue
            if len(chunk.embedding) != self._pgvector_dimensions():
                continue
            session.execute(
                text("UPDATE document_chunks SET embedding = CAST(:embedding AS vector) WHERE id = :chunk_id"),
                {"embedding": self._vector_literal(chunk.embedding), "chunk_id": chunk.chunk_id},
            )

    def _pgvector_dimensions(self) -> int:
        return settings.embedding_dimensions

    def _vector_literal(self, embedding: list[float]) -> str:
        return "[" + ",".join(str(round(float(value), 6)) for value in embedding) + "]"

    def _cosine_similarity(self, left: list[float], right: list[float]) -> float:
        if len(left) != len(right):
            return 0.0
        dot = sum(a * b for a, b in zip(left, right, strict=True))
        left_norm = sum(a * a for a in left) ** 0.5
        right_norm = sum(b * b for b in right) ** 0.5
        if not left_norm or not right_norm:
            return 0.0
        return dot / (left_norm * right_norm)


document_repository = DocumentRepository()
