from dataclasses import dataclass
from typing import Sequence

from app.schemas.documents import DocumentSummary


@dataclass(frozen=True)
class User:
    user_id: str
    name: str
    email: str
    roles: list[str]
    department: str
    clearance: str
    status: str = "active"
    auth_provider: str = "mock-sso"
    last_login: str = "2026-07-07T09:00:00Z"


MOCK_USERS: dict[str, User] = {
    "u-admin": User(
        "u-admin",
        "Avery Admin",
        "avery.admin@example.com",
        ["admin"],
        "IT",
        "restricted",
        last_login="2026-07-07T09:15:00Z",
    ),
    "u-hr": User(
        "u-hr",
        "Harper HR",
        "harper.hr@example.com",
        ["employee", "knowledge_manager"],
        "HR",
        "internal",
        last_login="2026-07-07T08:40:00Z",
    ),
    "u-employee": User(
        "u-employee",
        "Sam Employee",
        "sam.employee@example.com",
        ["employee"],
        "Engineering",
        "internal",
        last_login="2026-07-06T17:25:00Z",
    ),
    "u-finance": User(
        "u-finance",
        "Finley Finance",
        "finley.finance@example.com",
        ["employee", "finance_reviewer"],
        "Finance",
        "restricted",
        last_login="2026-07-07T07:55:00Z",
    ),
    "u-legal": User(
        "u-legal",
        "Logan Legal",
        "logan.legal@example.com",
        ["employee", "legal_reviewer"],
        "Legal",
        "restricted",
        status="review_required",
        last_login="2026-07-05T16:10:00Z",
    ),
}

CLEARANCE_RANK = {"public": 0, "internal": 1, "restricted": 2}


def get_mock_user(user_id: str) -> User | None:
    return MOCK_USERS.get(user_id)


def authorize_document(user: User, document: DocumentSummary) -> bool:
    if "admin" in user.roles:
        return True
    if document.department not in {user.department, "Global"}:
        return False
    return CLEARANCE_RANK[user.clearance] >= CLEARANCE_RANK[document.classification]


def filter_authorized(user: User, documents: Sequence[DocumentSummary]) -> list[DocumentSummary]:
    return [doc for doc in documents if authorize_document(user, doc)]
