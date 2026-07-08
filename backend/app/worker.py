import time

from redis.exceptions import RedisError
from sqlalchemy.exc import OperationalError

from app.db import init_db
from app.ingestion.jobs import document_from_job, folder_from_job, ingestion_job_queue, synthetic_from_job
from app.ingestion.service import ingestion_service
from app.observability.logging import configure_logging, get_logger


logger = get_logger(__name__)


def process_job(job: dict) -> None:
    job_id = job["job_id"]
    owner_id = job["owner_id"]
    payload = job["payload"]
    ingestion_job_queue.mark_running(job_id)

    try:
        if job["job_type"] == "document":
            document = document_from_job(payload["document"])
            docs = ingestion_service.ingest(
                document,
                owner_id=owner_id,
                generate_embeddings=payload.get("generate_embeddings", True),
            )
        elif job["job_type"] == "synthetic":
            synthetic = synthetic_from_job(payload["synthetic"])
            docs = ingestion_service.ingest_synthetic(
                synthetic,
                owner_id=owner_id,
                generate_embeddings=payload.get("generate_embeddings", True),
            )
        elif job["job_type"] == "folder":
            folder = folder_from_job(payload["folder"])
            docs = ingestion_service.ingest_folder(folder, owner_id=owner_id)
        else:
            raise ValueError(f"Unsupported job type: {job['job_type']}")

        ingestion_job_queue.mark_completed(job_id, [doc.document_id for doc in docs])
        logger.info("ingestion_job_completed", extra={"job_id": job_id, "document_count": len(docs)})
    except Exception as exc:
        ingestion_job_queue.mark_failed(job_id, str(exc))
        logger.exception("ingestion_job_failed", extra={"job_id": job_id})


def main() -> None:
    configure_logging()
    for attempt in range(30):
        try:
            init_db()
            break
        except OperationalError:
            if attempt == 29:
                raise
            time.sleep(1)
    logger.info("ingestion_worker_started")
    while True:
        try:
            job = ingestion_job_queue.dequeue()
        except RedisError:
            logger.exception("ingestion_worker_redis_unavailable")
            time.sleep(5)
            continue
        if job is None:
            time.sleep(1)
            continue
        process_job(job)


if __name__ == "__main__":
    main()
