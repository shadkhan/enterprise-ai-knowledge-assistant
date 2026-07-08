from app.retrieval import service as retrieval_module
from app.retrieval.service import RetrievalService
from app.schemas.retrieval import RetrievedChunk


class FakeReranker:
    def rerank(self, query: str, chunks: list[RetrievedChunk], top_n: int) -> list[RetrievedChunk]:
        preferred = sorted(chunks, key=lambda chunk: "target" in chunk.text, reverse=True)
        return [
            chunk.model_copy(update={"score": 10.0 - index})
            for index, chunk in enumerate(preferred[:top_n])
        ]


class FailingReranker:
    def rerank(self, query: str, chunks: list[RetrievedChunk], top_n: int) -> list[RetrievedChunk]:
        raise RuntimeError("model unavailable")


def _chunks() -> list[RetrievedChunk]:
    return [
        RetrievedChunk(document_id="doc-1", title="A", chunk_id="a", text="generic context", score=0.9),
        RetrievedChunk(document_id="doc-2", title="B", chunk_id="b", text="target context", score=0.1),
    ]


def test_rerank_reorders_candidates(monkeypatch) -> None:
    monkeypatch.setattr("app.core.config.settings.reranking_enabled", True)
    monkeypatch.setattr("app.core.config.settings.reranker_top_n", 2)
    monkeypatch.setattr(retrieval_module, "get_reranker", lambda: FakeReranker())

    results = RetrievalService()._rerank("target", _chunks(), top_k=1)

    assert results[0].chunk_id == "b"
    assert results[0].score == 10.0


def test_rerank_falls_back_to_existing_order(monkeypatch) -> None:
    monkeypatch.setattr("app.core.config.settings.reranking_enabled", True)
    monkeypatch.setattr("app.core.config.settings.reranker_top_n", 2)
    monkeypatch.setattr(retrieval_module, "get_reranker", lambda: FailingReranker())

    results = RetrievalService()._rerank("target", _chunks(), top_k=1)

    assert results[0].chunk_id == "a"
