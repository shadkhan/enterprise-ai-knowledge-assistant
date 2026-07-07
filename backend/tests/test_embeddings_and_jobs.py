from app.embeddings.mock_provider import MockEmbeddingProvider
from app.ingestion.jobs import synthetic_from_job
from app.schemas.documents import SyntheticContentRequest


def test_mock_embedding_provider_is_deterministic() -> None:
    provider = MockEmbeddingProvider()

    first = provider.embed_texts(["same text"])[0]
    second = provider.embed_texts(["same text"])[0]

    assert first == second
    assert len(first) == provider.dimensions


def test_synthetic_job_payload_round_trip() -> None:
    payload = SyntheticContentRequest(
        content_type="data",
        topic="Quarterly Controls",
        count=1,
    )

    restored = synthetic_from_job(payload.model_dump())

    assert restored.content_type == "data"
    assert restored.topic == "Quarterly Controls"
