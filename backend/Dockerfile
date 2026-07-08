FROM python:3.12-slim

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:0.5.14 /uv /uvx /bin/

COPY pyproject.toml uv.lock ./
ARG INSTALL_EMBEDDINGS=false
ARG INSTALL_LLM=false
ARG INSTALL_GCP=false
ARG INSTALL_AWS=false
RUN set -eux; \
    groups=""; \
    if [ "$INSTALL_EMBEDDINGS" = "true" ]; then groups="$groups --group embeddings"; fi; \
    if [ "$INSTALL_LLM" = "true" ]; then groups="$groups --group llm"; fi; \
    if [ "$INSTALL_GCP" = "true" ]; then groups="$groups --group gcp"; fi; \
    if [ "$INSTALL_AWS" = "true" ]; then groups="$groups --group aws"; fi; \
    uv sync --frozen --no-dev $groups

COPY app ./app
COPY data ./data

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
