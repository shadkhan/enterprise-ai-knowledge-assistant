from app.storage.base import StoredObject, StorageProvider
from app.core.config import settings


class GCSStorageProvider(StorageProvider):
    name = "gcs"

    def _bucket(self):
        if not settings.object_storage_bucket:
            raise RuntimeError("OBJECT_STORAGE_BUCKET is required when OBJECT_STORAGE_PROVIDER=gcs")
        try:
            from google.cloud import storage
        except ImportError as exc:
            raise RuntimeError("GCS storage requires optional dependency `google-cloud-storage`.") from exc
        return storage.Client().bucket(settings.object_storage_bucket)

    def save_upload(self, *, filename: str, content: bytes) -> str:
        key = f"{settings.object_storage_prefix.strip('/')}/{filename}"
        blob = self._bucket().blob(key)
        blob.upload_from_string(content)
        return key

    def list_ingestion_objects(self, *, prefix: str | None = None, max_files: int = 25) -> list[StoredObject]:
        bucket = self._bucket()
        key_prefix = prefix or settings.object_storage_prefix
        objects: list[StoredObject] = []
        for blob in bucket.list_blobs(prefix=key_prefix, max_results=max_files):
            if blob.name.endswith("/"):
                continue
            objects.append(
                StoredObject(
                    key=blob.name,
                    filename=blob.name.rsplit("/", 1)[-1],
                    content=blob.download_as_bytes(),
                )
            )
        return objects

    def archive_object(self, key: str) -> None:
        if not settings.ingestion_archive_folder:
            return
        bucket = self._bucket()
        source = bucket.blob(key)
        archive_key = f"{settings.ingestion_archive_folder.strip('/')}/{key.rsplit('/', 1)[-1]}"
        bucket.copy_blob(source, bucket, archive_key)
        source.delete()
