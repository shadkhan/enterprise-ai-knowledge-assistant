from app.core.config import settings
from app.ingestion.file_parsing import SUPPORTED_FILE_EXTENSIONS, parse_uploaded_file
from app.schemas.documents import DocumentCreate, FolderIngestionRequest
from app.storage import get_storage_provider


def build_documents_from_folder(payload: FolderIngestionRequest) -> list[tuple[DocumentCreate, str]]:
    provider = get_storage_provider()
    allowed = {extension.lower() for extension in (settings.ingestion_allowed_extensions or list(SUPPORTED_FILE_EXTENSIONS))}
    documents: list[tuple[DocumentCreate, str]] = []
    for stored_object in provider.list_ingestion_objects(prefix=payload.folder_path, max_files=payload.max_files):
        extension = "." + stored_object.filename.rsplit(".", 1)[-1].lower() if "." in stored_object.filename else ""
        if extension not in allowed:
            continue
        parsed = parse_uploaded_file(
            filename=stored_object.filename,
            content=stored_object.content,
            department=payload.department,
            classification=payload.classification,
            tags=[*payload.tags, "folder-sync"],
        )
        documents.append((parsed.document, stored_object.key))
    return documents


def archive_ingested_file(key: str) -> None:
    get_storage_provider().archive_object(key)
