import json
from datetime import UTC, datetime
from uuid import uuid4

from redis import Redis
from redis.exceptions import RedisError, TimeoutError as RedisTimeoutError

from app.core.config import settings
from app.schemas.documents import (
    DocumentCreate,
    IngestionJobCreate,
    IngestionJobStatus,
    SyntheticContentRequest,
    SyntheticIngestionJobCreate,
)


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


class IngestionJobQueue:
    def __init__(self) -> None:
        self.redis = Redis.from_url(
            settings.redis_url,
            decode_responses=True,
            health_check_interval=30,
            socket_keepalive=True,
        )

    def enqueue_document(self, payload: IngestionJobCreate, owner_id: str) -> IngestionJobStatus:
        return self._enqueue(
            job_type="document",
            owner_id=owner_id,
            payload={
                "document": payload.document.model_dump(),
                "generate_embeddings": payload.generate_embeddings,
            },
        )

    def enqueue_synthetic(self, payload: SyntheticIngestionJobCreate, owner_id: str) -> IngestionJobStatus:
        return self._enqueue(
            job_type="synthetic",
            owner_id=owner_id,
            payload={
                "synthetic": payload.synthetic.model_dump(),
                "generate_embeddings": payload.generate_embeddings,
            },
        )

    def dequeue(self, timeout_seconds: int = 5) -> dict | None:
        try:
            item = self.redis.blpop(settings.ingestion_queue_name, timeout=timeout_seconds)
        except RedisTimeoutError:
            return None
        if not item:
            return None
        _, raw_job = item
        return json.loads(raw_job)

    def get_status(self, job_id: str) -> IngestionJobStatus | None:
        raw = self.redis.get(self._key(job_id))
        if not raw:
            return None
        return IngestionJobStatus.model_validate_json(raw)

    def list_statuses(self, limit: int = 50) -> list[IngestionJobStatus]:
        try:
            statuses: list[IngestionJobStatus] = []
            for index, key in enumerate(self.redis.scan_iter("ingestion_job:*")):
                if index >= limit:
                    break
                raw = self.redis.get(key)
                if raw:
                    statuses.append(IngestionJobStatus.model_validate_json(raw))
            return sorted(statuses, key=lambda item: item.updated_at, reverse=True)
        except RedisError:
            return []

    def mark_running(self, job_id: str) -> None:
        self._update(job_id, status="running")

    def mark_completed(self, job_id: str, document_ids: list[str]) -> None:
        self._update(
            job_id,
            status="completed",
            document_count=len(document_ids),
            result_document_ids=document_ids,
            error=None,
        )

    def mark_failed(self, job_id: str, error: str) -> None:
        self._update(job_id, status="failed", error=error)

    def ping(self) -> None:
        self.redis.ping()

    def _enqueue(self, job_type: str, owner_id: str, payload: dict) -> IngestionJobStatus:
        try:
            self.ping()
        except RedisError as exc:
            raise RuntimeError("Redis is unavailable for ingestion jobs") from exc

        now = utc_now()
        job_id = f"job-{uuid4().hex[:12]}"
        status = IngestionJobStatus(
            job_id=job_id,
            status="queued",
            job_type=job_type,
            owner_id=owner_id,
            created_at=now,
            updated_at=now,
        )
        job = {
            "job_id": job_id,
            "job_type": job_type,
            "owner_id": owner_id,
            "payload": payload,
        }
        self.redis.set(self._key(job_id), status.model_dump_json(), ex=settings.ingestion_job_ttl_seconds)
        self.redis.rpush(settings.ingestion_queue_name, json.dumps(job))
        return status

    def _update(self, job_id: str, **changes: object) -> None:
        current = self.get_status(job_id)
        if not current:
            return
        data = current.model_dump()
        data.update(changes)
        data["updated_at"] = utc_now()
        updated = IngestionJobStatus.model_validate(data)
        self.redis.set(self._key(job_id), updated.model_dump_json(), ex=settings.ingestion_job_ttl_seconds)

    def _key(self, job_id: str) -> str:
        return f"ingestion_job:{job_id}"


def document_from_job(payload: dict) -> DocumentCreate:
    return DocumentCreate.model_validate(payload)


def synthetic_from_job(payload: dict) -> SyntheticContentRequest:
    return SyntheticContentRequest.model_validate(payload)


ingestion_job_queue = IngestionJobQueue()
