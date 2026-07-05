from pydantic import BaseModel, Field


class RetrievedChunk(BaseModel):
    document_id: str
    title: str
    chunk_id: str
    text: str
    score: float
    metadata: dict = Field(default_factory=dict)
