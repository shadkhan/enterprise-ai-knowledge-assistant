from langchain_text_splitters import RecursiveCharacterTextSplitter
from llama_index.core import Document

from app.schemas.documents import DocumentChunk


splitter = RecursiveCharacterTextSplitter(
    chunk_size=1200,
    chunk_overlap=180,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def chunk_text(document_id: str, text: str) -> list[DocumentChunk]:
    chunks = splitter.split_text(text)
    return [
        DocumentChunk(
            chunk_id=f"{document_id}-chunk-{index + 1}",
            document_id=document_id,
            text=chunk,
        )
        for index, chunk in enumerate(chunks)
    ] or [DocumentChunk(chunk_id=f"{document_id}-chunk-1", document_id=document_id, text="")]


def chunk_llama_document(document_id: str, document: Document) -> list[DocumentChunk]:
    return chunk_text(document_id, document.get_content())
