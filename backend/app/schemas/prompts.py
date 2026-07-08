from pydantic import BaseModel, Field


PromptType = str
PromptStatus = str


class PromptTemplateCreate(BaseModel):
    key: str = Field(..., min_length=3)
    name: str = Field(..., min_length=3)
    prompt_type: PromptType = Field(..., pattern="^(system|retrieval|evaluation|summarization|guardrail)$")
    content: str = Field(..., min_length=20)
    description: str | None = None
    owner: str = "AI Platform"
    status: PromptStatus = Field(default="draft", pattern="^(draft|active|archived)$")
    metadata: dict = Field(default_factory=dict)


class PromptTemplateSummary(BaseModel):
    id: int
    key: str
    name: str
    prompt_type: PromptType
    version: int
    status: PromptStatus
    content: str
    description: str | None = None
    owner: str
    created_by: str
    metadata: dict
    created_at: str
    updated_at: str


class PromptPreviewRequest(BaseModel):
    key: str = "rag_chat_system"
    question: str = "How many days can employees work remotely?"
    contexts: list[str] = Field(default_factory=list)


class PromptPreviewResponse(BaseModel):
    key: str
    version: int
    status: PromptStatus
    messages: list[dict[str, str]]
