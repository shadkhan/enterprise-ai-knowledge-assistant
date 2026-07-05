from dataclasses import dataclass
from typing import Sequence

from app.schemas.documents import DocumentSummary


@dataclass(frozen=True)
class User:
    user_id: str
    name: str
    roles: list[str]
    department: str
    clearance: str


MOCK_USERS: dict[str, User] = {
    "u-admin": User("u-admin", "Avery Admin", ["admin"], "IT", "restricted"),
    "u-hr": User("u-hr", "Harper HR", ["employee", "knowledge_manager"], "HR", "internal"),
    "u-employee": User("u-employee", "Sam Employee", ["employee"], "Engineering", "internal"),
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

