from app.core.config import settings
from app.storage.base import StorageProvider
from app.storage.gcs_provider import GCSStorageProvider
from app.storage.local_provider import LocalStorageProvider
from app.storage.s3_provider import S3StorageProvider


def get_storage_provider(provider_name: str | None = None) -> StorageProvider:
    provider = provider_name or settings.object_storage_provider
    if provider == "local":
        return LocalStorageProvider()
    if provider == "gcs":
        return GCSStorageProvider()
    if provider == "s3":
        return S3StorageProvider()
    raise ValueError(f"Unsupported storage provider: {provider}")
