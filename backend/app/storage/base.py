from dataclasses import dataclass


@dataclass(frozen=True)
class StoredObject:
    key: str
    filename: str
    content: bytes


class StorageProvider:
    name = "base"

    def save_upload(self, *, filename: str, content: bytes) -> str:
        raise NotImplementedError

    def list_ingestion_objects(self, *, prefix: str | None = None, max_files: int = 25) -> list[StoredObject]:
        raise NotImplementedError

    def archive_object(self, key: str) -> None:
        raise NotImplementedError
