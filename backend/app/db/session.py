from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy import text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


def _normalize_database_url(url: str) -> str:
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


engine_kwargs = {}
if settings.database_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(_normalize_database_url(settings.database_url), **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
is_postgres = engine.dialect.name == "postgresql"


class Base(DeclarativeBase):
    pass


def get_session() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        yield session


def init_db() -> None:
    from app.db import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    if is_postgres:
        _ensure_pgvector_schema()


def _ensure_pgvector_schema() -> None:
    with engine.begin() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        column_type = connection.execute(
            text(
                """
                SELECT format_type(a.atttypid, a.atttypmod)
                FROM pg_attribute a
                JOIN pg_class c ON c.oid = a.attrelid
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.relname = 'document_chunks'
                  AND n.nspname = 'public'
                  AND a.attname = 'embedding'
                  AND NOT a.attisdropped
                """
            )
        ).scalar()

        expected_type = f"vector({settings.embedding_dimensions})"
        if column_type is None:
            connection.execute(
                text(f"ALTER TABLE document_chunks ADD COLUMN embedding vector({settings.embedding_dimensions})")
            )
        elif column_type != expected_type:
            connection.execute(text("UPDATE document_chunks SET embedding = NULL"))
            connection.execute(
                text(
                    f"ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector({settings.embedding_dimensions})"
                )
            )

        connection.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
                ON document_chunks USING ivfflat (embedding vector_cosine_ops)
                """
            )
        )
