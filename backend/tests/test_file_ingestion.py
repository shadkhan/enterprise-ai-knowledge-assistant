from fastapi.testclient import TestClient

from app.db import init_db
from app.main import app


init_db()
client = TestClient(app)


def test_file_upload_ingests_text_document() -> None:
    response = client.post(
        "/ingest/files",
        headers={"X-User-Id": "u-admin"},
        data={"department": "Global", "classification": "internal", "tags": "upload,test"},
        files={"files": ("upload-policy.txt", b"Uploaded policy text for file ingestion.", "text/plain")},
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["source_type"] == "file:txt"
    assert "file-upload" in body[0]["tags"]


def test_folder_ingestion_reads_configured_folder(tmp_path) -> None:
    source = tmp_path / "folder-policy.md"
    source.write_text("# Folder Policy\n\nBatch folder ingestion works.", encoding="utf-8")

    response = client.post(
        "/ingest/folder",
        headers={"X-User-Id": "u-admin"},
        json={
            "folder_path": str(tmp_path),
            "department": "Global",
            "classification": "internal",
            "tags": ["folder-test"],
            "generate_embeddings": True,
            "archive_after_ingest": False,
            "max_files": 5,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["source_type"] == "file:md"
    assert "folder-sync" in body[0]["tags"]
