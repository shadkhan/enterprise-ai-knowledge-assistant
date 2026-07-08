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
