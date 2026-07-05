from fastapi.testclient import TestClient

from app.main import app


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

