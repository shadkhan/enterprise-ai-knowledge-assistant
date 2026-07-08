from abc import ABC, abstractmethod

from app.schemas.retrieval import RetrievedChunk


class Reranker(ABC):
    @abstractmethod
    def rerank(self, query: str, chunks: list[RetrievedChunk], top_n: int) -> list[RetrievedChunk]:
        raise NotImplementedError
