from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Enterprise AI Knowledge Assistant"
    environment: str = "local"
    database_url: str = "sqlite:///./knowledge.db"
    redis_url: str = "redis://localhost:6379/0"
    default_llm_provider: str = "mock"
    openai_api_key: str | None = None
    openai_base_url: str | None = None
    openai_timeout_seconds: float = 30.0
    openai_max_output_tokens: int = 700
    openai_fallback_to_mock: bool = True
    openai_mock_latency_ms: int = 120
    cheap_model: str = "cheap-fast-model"
    premium_model: str = "premium-reasoning-model"
    openai_cheap_model: str = "gpt-4o-mini"
    openai_premium_model: str = "gpt-4o"
    default_embedding_provider: str = "mock"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dimensions: int = 384
    retrieval_mode: str = "hybrid"
    lexical_weight: float = 0.35
    vector_weight: float = 0.65
    reranking_enabled: bool = False
    reranker_provider: str = "sentence_transformers"
    reranker_model: str = "BAAI/bge-reranker-base"
    reranker_top_n: int = 5
    reranker_candidate_multiplier: int = 4
    ingestion_queue_name: str = "ingestion_jobs"
    ingestion_job_ttl_seconds: int = 86400
    retrieval_cache_ttl_seconds: int = 300
    semantic_cache_enabled: bool = True
    semantic_cache_ttl_seconds: int = 3600
    semantic_cache_similarity_threshold: float = 0.94
    semantic_cache_max_scan: int = 200
    enable_demo_seed: bool = True
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    cors_origin_regex: str = r"^http://(localhost|127\.0\.0\.1):\d+$"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
