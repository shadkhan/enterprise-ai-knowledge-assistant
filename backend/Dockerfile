FROM python:3.12-slim

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:0.5.14 /uv /uvx /bin/

COPY pyproject.toml uv.lock ./
ARG INSTALL_EMBEDDINGS=false
ARG INSTALL_LLM=false
RUN if [ "$INSTALL_EMBEDDINGS" = "true" ] && [ "$INSTALL_LLM" = "true" ]; then uv sync --frozen --no-dev --group embeddings --group llm; elif [ "$INSTALL_EMBEDDINGS" = "true" ]; then uv sync --frozen --no-dev --group embeddings; elif [ "$INSTALL_LLM" = "true" ]; then uv sync --frozen --no-dev --group llm; else uv sync --frozen --no-dev; fi

COPY app ./app
COPY data ./data

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
