# Enterprise AI Knowledge Assistant

Reference implementation skeleton for a secure enterprise RAG assistant. It demonstrates ingestion, permission-aware retrieval, model routing, LLM provider abstraction, evaluation hooks, cost tracking, structured logs, and a simple API/UI.

## What is included

- FastAPI backend with `/chat`, `/ingest`, `/documents`, `/health`, `/metrics/cost`, and `/evaluate`
- Mock RBAC for users, departments, roles, and document classifications
- Mock ingestion, chunking, keyword retrieval, LLM provider, routing, guardrails, evaluation, and cost tracking
- Next.js + Tailwind UI with chat, citations, source panel, and admin metrics placeholder
- Docker Compose with backend, frontend, PostgreSQL + pgvector, and Redis
- Interview-friendly docs in `docs/`

## Quick start: backend only

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open `http://localhost:8000/docs`.

Seed a document:

```bash
curl -X POST http://localhost:8000/ingest \
  -H "Content-Type: application/json" \
  -H "X-User-Id: u-admin" \
  -d "{\"title\":\"Remote Work Policy\",\"text\":\"Employees may work remotely two days per week with manager approval.\",\"department\":\"Global\",\"classification\":\"internal\",\"source_type\":\"confluence\",\"tags\":[\"policy\"]}"
```

Ask a question:

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -H "X-User-Id: u-employee" \
  -d "{\"question\":\"How many days can employees work remotely?\"}"
```

## Quick start: full stack

```bash
cd infra
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend API docs: `http://localhost:8000/docs`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

## Mock users

- `u-admin`: admin, IT, restricted clearance
- `u-hr`: employee and knowledge manager, HR, internal clearance
- `u-employee`: employee, Engineering, internal clearance

Pass the selected user with the `X-User-Id` header.

## Production extension points

- Replace in-memory stores with PostgreSQL repositories and pgvector search
- Add object storage for raw files and parser workers for PDFs, Office, Confluence, SharePoint, and Jira
- Add Celery for asynchronous ingestion and embedding jobs
- Replace mock LLM provider with OpenAI, Anthropic, or approved local models
- Persist cost/evaluation telemetry and export traces to OpenTelemetry-compatible tooling
- Integrate enterprise SSO, ABAC policies, DLP, audit logs, and secrets management

