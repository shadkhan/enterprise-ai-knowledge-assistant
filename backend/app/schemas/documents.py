from pydantic import BaseModel, Field


class DocumentCreate(BaseModel):
    title: str
    text: str
    source_type: str = Field(default="manual", examples=["pdf", "confluence", "sharepoint", "jira"])
    department: str = Field(default="Global")
    classification: str = Field(default="internal", pattern="^(public|internal|restricted)$")
    tags: list[str] = Field(default_factory=list)


class DocumentSummary(BaseModel):
    document_id: str
    title: str
    source_type: str
    department: str
    classification: str
    tags: list[str] = Field(default_factory=list)
    owner_id: str
    metadata: dict = Field(default_factory=dict)


class DocumentChunk(BaseModel):
    chunk_id: str
    document_id: str
    text: str
