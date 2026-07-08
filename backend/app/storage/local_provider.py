from pathlib import Path
from shutil import move

from app.core.config import settings
from app.storage.base import StoredObject, StorageProvider


class LocalStorageProvider(StorageProvider):
    name = "local"

    def save_upload(self, *, filename: str, content: bytes) -> str:
        root = Path(settings.local_storage_path).expanduser().resolve()
        root.mkdir(parents=True, exist_ok=True)
        destination = root / Path(filename).name
        if destination.exists():
            destination = root / f"{destination.stem}-{destination.stat().st_mtime_ns}{destination.suffix}"
        destination.write_bytes(content)
        return str(destination)

    def list_ingestion_objects(self, *, prefix: str | None = None, max_files: int = 25) -> list[StoredObject]:
        root = Path(prefix or settings.ingestion_watch_folder or settings.local_storage_path).expanduser().resolve()
        if not root.exists():
            raise ValueError(f"Ingestion folder does not exist: {root}")
        if not root.is_dir():
            raise ValueError(f"Ingestion path is not a folder: {root}")

        objects: list[StoredObject] = []
        for path in sorted(root.iterdir()):
            if len(objects) >= max_files:
                break
            if path.is_file():
                objects.append(StoredObject(key=str(path), filename=path.name, content=path.read_bytes()))
        return objects

    def archive_object(self, key: str) -> None:
        if not settings.ingestion_archive_folder:
            return
        path = Path(key).expanduser().resolve()
        archive_root = Path(settings.ingestion_archive_folder).expanduser().resolve()
        archive_root.mkdir(parents=True, exist_ok=True)
        destination = archive_root / path.name
        if destination.exists():
            destination = archive_root / f"{path.stem}-{path.stat().st_mtime_ns}{path.suffix}"
        move(str(path), str(destination))
