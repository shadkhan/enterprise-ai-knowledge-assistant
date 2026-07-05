from abc import ABC, abstractmethod
from pydantic import BaseModel

from app.schemas.retrieval import RetrievedChunk


class TokenUsage(BaseModel):
    prompt_tokens: int
    completion_tokens: int


class LLMResult(BaseModel):
    answer: str
    usage: TokenUsage


class LLMProvider(ABC):
    @abstractmethod
    def generate_answer(self, question: str, contexts: list[RetrievedChunk], model: str) -> LLMResult:
        raise NotImplementedError

