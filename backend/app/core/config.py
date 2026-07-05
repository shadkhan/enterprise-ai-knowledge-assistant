from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Enterprise AI Knowledge Assistant"
    environment: str = "local"
    database_url: str = "postgresql://postgres:postgres@postgres:5432/knowledge"
    redis_url: str = "redis://redis:6379/0"
    default_llm_provider: str = "mock"
    cors_origins: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()

