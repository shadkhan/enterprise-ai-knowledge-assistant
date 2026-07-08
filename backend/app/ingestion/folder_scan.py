from pathlib import Path
from shutil import move

from app.core.config import settings
from app.ingestion.file_parsing import SUPPORTED_FILE_EXTENSIONS, parse_file_path
from app.schemas.documents import DocumentCreate, FolderIngestionRequest


def resolve_ingestion_folder(folder_path: str | None = None) -> Path:
    root = Path(folder_path or settings.ingestion_watch_folder).expanduser().resolve()
    if not root.exists():
        raise ValueError(f"Ingestion folder does not exist: {root}")
    if not root.is_dir():
        raise ValueError(f"Ingestion path is not a folder: {root}")
    return root


def build_documents_from_folder(payload: FolderIngestionRequest) -> list[tuple[DocumentCreate, Path]]:
    root = resolve_ingestion_folder(payload.folder_path)
    allowed = {extension.lower() for extension in (settings.ingestion_allowed_extensions or list(SUPPORTED_FILE_EXTENSIONS))}
    documents: list[tuple[DocumentCreate, Path]] = []
    for path in sorted(root.iterdir()):
        if len(documents) >= payload.max_files:
            break
        if not path.is_file() or path.suffix.lower() not in allowed:
            continue
        parsed = parse_file_path(
            path=path,
            department=payload.department,
            classification=payload.classification,
            tags=payload.tags,
        )
        documents.append((parsed.document, path))
    return documents


def archive_ingested_file(path: Path) -> None:
    if not settings.ingestion_archive_folder:
        return
    archive_root = Path(settings.ingestion_archive_folder).expanduser().resolve()
    archive_root.mkdir(parents=True, exist_ok=True)
    destination = archive_root / path.name
    if destination.exists():
        destination = archive_root / f"{path.stem}-{path.stat().st_mtime_ns}{path.suffix}"
    move(str(path), str(destination))
