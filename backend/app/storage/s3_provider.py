from app.storage.base import StoredObject, StorageProvider
from app.core.config import settings


class S3StorageProvider(StorageProvider):
    name = "s3"

    def _client(self):
        if not settings.object_storage_bucket:
            raise RuntimeError("OBJECT_STORAGE_BUCKET is required when OBJECT_STORAGE_PROVIDER=s3")
        try:
            import boto3
        except ImportError as exc:
            raise RuntimeError("S3 storage requires optional dependency `boto3`.") from exc
        return boto3.client("s3")

    def save_upload(self, *, filename: str, content: bytes) -> str:
        key = f"{settings.object_storage_prefix.strip('/')}/{filename}"
        self._client().put_object(Bucket=settings.object_storage_bucket, Key=key, Body=content)
        return key

    def list_ingestion_objects(self, *, prefix: str | None = None, max_files: int = 25) -> list[StoredObject]:
        client = self._client()
        key_prefix = prefix or settings.object_storage_prefix
        response = client.list_objects_v2(
            Bucket=settings.object_storage_bucket,
            Prefix=key_prefix,
            MaxKeys=max_files,
        )
        objects: list[StoredObject] = []
        for item in response.get("Contents", []):
            key = item["Key"]
            if key.endswith("/"):
                continue
            body = client.get_object(Bucket=settings.object_storage_bucket, Key=key)["Body"].read()
            objects.append(StoredObject(key=key, filename=key.rsplit("/", 1)[-1], content=body))
        return objects

    def archive_object(self, key: str) -> None:
        if not settings.ingestion_archive_folder:
            return
        archive_key = f"{settings.ingestion_archive_folder.strip('/')}/{key.rsplit('/', 1)[-1]}"
        client = self._client()
        client.copy_object(
            Bucket=settings.object_storage_bucket,
            CopySource={"Bucket": settings.object_storage_bucket, "Key": key},
            Key=archive_key,
        )
        client.delete_object(Bucket=settings.object_storage_bucket, Key=key)
