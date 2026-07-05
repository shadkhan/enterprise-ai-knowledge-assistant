from app.schemas.documents import DocumentChunk


def chunk_text(document_id: str, text: str, chunk_size: int = 700) -> list[DocumentChunk]:
    words = text.split()
    chunks: list[DocumentChunk] = []

    for index in range(0, len(words), chunk_size):
        chunk_words = words[index : index + chunk_size]
        chunks.append(
            DocumentChunk(
                chunk_id=f"{document_id}-chunk-{len(chunks) + 1}",
                document_id=document_id,
                text=" ".join(chunk_words),
            )
        )

    return chunks or [DocumentChunk(chunk_id=f"{document_id}-chunk-1", document_id=document_id, text="")]

