from fastapi.testclient import TestClient

from app.db import init_db
from app.ingestion.chunking import chunk_text
from app.main import app


init_db()
client = TestClient(app)


def test_langchain_chunking_splits_long_text() -> None:
    text = " ".join(f"policy requirement {index}." for index in range(500))

    chunks = chunk_text("doc-test", text)

    assert len(chunks) > 1
    assert chunks[0].chunk_id == "doc-test-chunk-1"
    assert all(chunk.text for chunk in chunks)


def test_synthetic_json_documents_can_be_ingested_and_retrieved() -> None:
    ingest_response = client.post(
        "/synthetic/documents",
        headers={"X-User-Id": "u-admin"},
        json={
            "content_type": "json",
            "topic": "Access Review Controls",
            "department": "Global",
            "classification": "internal",
            "count": 2,
            "tags": ["controls"],
        },
    )

    assert ingest_response.status_code == 200
    body = ingest_response.json()
    assert len(body) == 2
    assert all(item["source_type"] == "synthetic_json" for item in body)

    chat_response = client.post(
        "/chat",
        headers={"X-User-Id": "u-employee"},
        json={"question": "What controls must be reviewed for access review?"},
    )

    assert chat_response.status_code == 200
    assert chat_response.json()["citations"]
