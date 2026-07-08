from fastapi.testclient import TestClient

from app.db import init_db
from app.main import app


init_db()
client = TestClient(app)


def test_auth_me_returns_selected_mock_user() -> None:
    response = client.get("/auth/me", headers={"X-User-Id": "u-finance"})

    assert response.status_code == 200
    body = response.json()
    assert body["user_id"] == "u-finance"
    assert body["department"] == "Finance"
    assert "finance_reviewer" in body["roles"]


def test_admin_users_requires_admin_role() -> None:
    response = client.get("/admin/users", headers={"X-User-Id": "u-employee"})

    assert response.status_code == 403


def test_admin_users_returns_five_mock_users() -> None:
    response = client.get("/admin/users", headers={"X-User-Id": "u-admin"})

    assert response.status_code == 200
    users = response.json()
    assert len(users) == 5
    assert {user["user_id"] for user in users} == {"u-admin", "u-hr", "u-employee", "u-finance", "u-legal"}


def test_admin_settings_and_governance() -> None:
    settings_response = client.get("/admin/settings", headers={"X-User-Id": "u-admin"})
    governance_response = client.get("/admin/governance", headers={"X-User-Id": "u-admin"})

    assert settings_response.status_code == 200
    assert settings_response.json()["retrieval_mode"] in {"lexical", "vector", "hybrid"}
    assert governance_response.status_code == 200
    assert governance_response.json()["policies"]


def test_admin_documents_and_detail() -> None:
    ingest_response = client.post(
        "/ingest",
        headers={"X-User-Id": "u-admin"},
        json={
            "title": "Admin Document Test",
            "text": "This document should be visible in admin knowledge operations.",
            "source_type": "manual",
            "department": "Global",
            "classification": "internal",
            "tags": ["admin-test"],
        },
    )
    assert ingest_response.status_code == 200
    document_id = ingest_response.json()[0]["document_id"]

    list_response = client.get("/admin/documents", headers={"X-User-Id": "u-admin"})
    detail_response = client.get(f"/admin/documents/{document_id}", headers={"X-User-Id": "u-admin"})

    assert list_response.status_code == 200
    assert any(item["document_id"] == document_id for item in list_response.json())
    assert detail_response.status_code == 200
    assert detail_response.json()["document"]["chunk_count"] >= 1


def test_admin_ingestion_jobs_endpoint_is_admin_only() -> None:
    forbidden = client.get("/admin/ingest/jobs", headers={"X-User-Id": "u-employee"})
    allowed = client.get("/admin/ingest/jobs", headers={"X-User-Id": "u-admin"})

    assert forbidden.status_code == 403
    assert allowed.status_code == 200
    assert isinstance(allowed.json(), list)


def test_admin_evaluation_endpoints() -> None:
    client.post(
        "/ingest",
        headers={"X-User-Id": "u-admin"},
        json={
            "title": "Remote Work Policy",
            "text": "Employees may work remotely two days per week with manager approval.",
            "source_type": "manual",
            "department": "Global",
            "classification": "internal",
            "tags": ["policy"],
        },
    )

    run_response = client.post("/admin/evaluations/run", headers={"X-User-Id": "u-admin"})
    list_response = client.get("/admin/evaluations", headers={"X-User-Id": "u-admin"})
    forbidden = client.get("/admin/evaluations", headers={"X-User-Id": "u-employee"})

    assert run_response.status_code == 200
    assert run_response.json()["total_cases"] >= 1
    assert "results" in run_response.json()
    assert list_response.status_code == 200
    assert list_response.json()
    assert forbidden.status_code == 403
