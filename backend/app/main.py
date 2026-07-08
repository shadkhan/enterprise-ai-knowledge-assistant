from contextlib import asynccontextmanager
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError

from app.api.routes import router
from app.core.config import settings
from app.db import init_db
from app.ingestion.service import ingestion_service
from app.observability.logging import configure_logging
from app.repositories.prompts import prompt_repository
from app.schemas.documents import DocumentCreate


configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    for attempt in range(30):
        try:
            init_db()
            prompt_repository.ensure_seeded()
            break
        except OperationalError:
            if attempt == 29:
                raise
            time.sleep(1)
    if settings.enable_demo_seed and not ingestion_service.has_documents():
        ingestion_service.ingest(
            DocumentCreate(
                title="Remote Work Policy",
                text="Employees may work remotely two days per week with manager approval.",
                source_type="confluence",
                department="Global",
                classification="internal",
                tags=["policy", "demo"],
            ),
            owner_id="u-admin",
        )
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Reference skeleton for an Enterprise AI Knowledge Assistant.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
