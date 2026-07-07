from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Enterprise AI Knowledge Assistant"
    environment: str = "local"
    database_url: str = "sqlite:///./knowledge.db"
    redis_url: str = "redis://localhost:6379/0"
    default_llm_provider: str = "mock"
    default_embedding_provider: str = "mock"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dimensions: int = 384
    retrieval_mode: str = "hybrid"
    lexical_weight: float = 0.35
    vector_weight: float = 0.65
    ingestion_queue_name: str = "ingestion_jobs"
    ingestion_job_ttl_seconds: int = 86400
    retrieval_cache_ttl_seconds: int = 300
    enable_demo_seed: bool = True
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    cors_origin_regex: str = r"^http://(localhost|127\.0\.0\.1):\d+$"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
