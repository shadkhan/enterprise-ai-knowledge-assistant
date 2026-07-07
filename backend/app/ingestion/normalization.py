from llama_index.core import Document

from app.schemas.documents import DocumentCreate


def to_llama_document(payload: DocumentCreate, metadata: dict) -> Document:
    return Document(
        text=payload.text,
        metadata={
            **metadata,
            "title": payload.title,
            "source_type": payload.source_type,
        },
    )
