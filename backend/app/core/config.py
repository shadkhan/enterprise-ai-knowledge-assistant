from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Enterprise AI Knowledge Assistant"
    environment: str = "local"
    database_url: str = "sqlite:///./knowledge.db"
    redis_url: str = "redis://redis:6379/0"
    default_llm_provider: str = "mock"
    enable_demo_seed: bool = True
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    cors_origin_regex: str = r"^http://(localhost|127\.0\.0\.1):\d+$"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
