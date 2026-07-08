import csv
import json
from io import StringIO
from pathlib import Path

from app.schemas.documents import DocumentCreate


SUPPORTED_FILE_EXTENSIONS = {".txt", ".md", ".csv", ".json"}


class ParsedFile:
    def __init__(self, document: DocumentCreate, size_bytes: int, original_filename: str) -> None:
        self.document = document
        self.size_bytes = size_bytes
        self.original_filename = original_filename


def parse_uploaded_file(
    *,
    filename: str,
    content: bytes,
    department: str,
    classification: str,
    tags: list[str],
) -> ParsedFile:
    extension = Path(filename).suffix.lower()
    if extension not in SUPPORTED_FILE_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {extension or 'unknown'}")

    text = _decode_text(content)
    parsed_text = _parse_by_extension(extension, text)
    title = Path(filename).stem.replace("_", " ").replace("-", " ").strip() or filename
    document = DocumentCreate(
        title=title,
        text=parsed_text,
        source_type=f"file:{extension.removeprefix('.')}",
        department=department,
        classification=classification,
        tags=sorted(set([*tags, "file-upload", extension.removeprefix(".")])),
    )
    return ParsedFile(document=document, size_bytes=len(content), original_filename=filename)


def parse_file_path(
    *,
    path: Path,
    department: str,
    classification: str,
    tags: list[str],
) -> ParsedFile:
    return parse_uploaded_file(
        filename=path.name,
        content=path.read_bytes(),
        department=department,
        classification=classification,
        tags=[*tags, "folder-sync"],
    )


def _decode_text(content: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "cp1252"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError("File could not be decoded as text")


def _parse_by_extension(extension: str, text: str) -> str:
    if extension in {".txt", ".md"}:
        return text.strip()
    if extension == ".json":
        parsed = json.loads(text)
        return json.dumps(parsed, indent=2, sort_keys=True)
    if extension == ".csv":
        reader = csv.DictReader(StringIO(text))
        if reader.fieldnames:
            rows = list(reader)
            rendered = ["CSV columns: " + ", ".join(reader.fieldnames)]
            for index, row in enumerate(rows[:500], start=1):
                rendered.append(f"Row {index}: " + "; ".join(f"{key}={value}" for key, value in row.items()))
            return "\n".join(rendered)
        return text.strip()
    raise ValueError(f"Unsupported file type: {extension}")
