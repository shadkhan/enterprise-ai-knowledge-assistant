from fastapi.testclient import TestClient

from app.db import init_db
from app.main import app


init_db()
client = TestClient(app)


def test_chat_flow_with_ingested_document() -> None:
    ingest_response = client.post(
        "/ingest",
        headers={"X-User-Id": "u-admin"},
        json={
            "title": "Remote Work Policy",
            "text": "Employees may work remotely two days per week with manager approval.",
            "source_type": "confluence",
            "department": "Global",
            "classification": "internal",
            "tags": ["policy"],
        },
    )
    assert ingest_response.status_code == 200

    chat_response = client.post(
        "/chat",
        headers={"X-User-Id": "u-employee"},
        json={"question": "How many days can employees work remotely?"},
    )
    assert chat_response.status_code == 200
    body = chat_response.json()
    assert body["citations"]
    assert body["estimated_cost_usd"] >= 0
    assert body["conversation_id"]

    sessions_response = client.get("/chat/sessions", headers={"X-User-Id": "u-employee"})
    assert sessions_response.status_code == 200
    assert any(item["conversation_id"] == body["conversation_id"] for item in sessions_response.json())

    detail_response = client.get(f"/chat/sessions/{body['conversation_id']}", headers={"X-User-Id": "u-employee"})
    assert detail_response.status_code == 200
    assert len(detail_response.json()["messages"]) >= 2

    chunk_id = body["citations"][0]["chunk_id"]
    preview_response = client.get(f"/documents/chunks/{chunk_id}", headers={"X-User-Id": "u-employee"})
    assert preview_response.status_code == 200
    assert preview_response.json()["text"]
