from uuid import uuid4

from app.auth.rbac import MOCK_USERS
from app.repositories.documents import document_repository
from app.schemas.documents import DocumentChunk, DocumentSummary


def test_metadata_vector_search_uses_chunk_embeddings() -> None:
    document_id = f"doc-vector-test-{uuid4().hex[:8]}"
    summary = DocumentSummary(
        document_id=document_id,
        title="Vector Search Policy",
        source_type="manual",
        department="Global",
        classification="internal",
        tags=["vector-test"],
        owner_id="u-admin",
        metadata={"tags": ["vector-test"]},
    )
    chunks = [
        DocumentChunk(
            chunk_id=f"{document_id}-chunk-1",
            document_id=document_id,
            text="This chunk is about reimbursement policy.",
            embedding=[1.0, 0.0, 0.0],
        ),
        DocumentChunk(
            chunk_id=f"{document_id}-chunk-2",
            document_id=document_id,
            text="This chunk is about office lunch schedules.",
            embedding=[0.0, 1.0, 0.0],
        ),
    ]
    document_repository.save_document(summary, chunks)

    results = document_repository._metadata_vector_search([1.0, 0.0, 0.0], MOCK_USERS["u-employee"], top_k=1)

    assert results
    assert results[0].chunk_id == f"{document_id}-chunk-1"
