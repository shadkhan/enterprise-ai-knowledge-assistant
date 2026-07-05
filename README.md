# Enterprise AI Knowledge Assistant

Reference implementation for a secure enterprise RAG assistant. Employees can ask questions over internal knowledge, receive cited answers, and see model/cost telemetry while the backend enforces mock role, department, and clearance rules.

The project is currently a runnable MVP plus part of the persistent RAG foundation. It is still not production-ready: LLM generation, retrieval quality, identity, security controls, and ingestion connectors are intentionally simplified so the architecture remains easy to inspect and extend.

## Current Status

Done:

- FastAPI backend with `/chat`, `/ingest`, `/documents`, `/health`, `/metrics/cost`, and `/evaluate`
- Mock RBAC users with role, department, and clearance-based document visibility
- SQLAlchemy repository layer
- SQLite persistence for backend-only local development
- PostgreSQL-compatible persistence for Docker/full-stack runs
- Persistent documents, chunks, cost records, and evaluation records
- Keyword retrieval over authorized chunks
- Mock LLM provider with citations
- OpenAI provider placeholder
- Rules-based model routing
- Prompt-injection and PII placeholder guardrails
- Structured JSON logs
- Improved Next.js chat UI with conversation history, user selector, answer quality selector, source panel, visible documents panel, and typewriter response animation
- Admin metrics page for cost/token summaries
- Docker Compose with backend, frontend, PostgreSQL + pgvector, and Redis
- `uv` for Python package management
- `pnpm` for frontend package management
- Demo `Remote Work Policy` auto-seed when the database is empty

Not done yet:

- Real embeddings and pgvector retrieval
- Hybrid lexical + semantic search
- Real OpenAI/Anthropic/local model implementation
- Streaming API responses from the backend
- Real file upload and document parsers
- Enterprise SSO and document-level ACL sync
- Production DLP, audit logging, and policy enforcement
- Full observability traces and quality dashboards

## Tech Stack

- Backend: FastAPI, Pydantic, SQLAlchemy, uv
- Frontend: Next.js, React, Tailwind CSS, pnpm
- Infra: Docker Compose, PostgreSQL, pgvector, Redis
- Current local persistence: SQLite for backend-only mode, PostgreSQL for Docker mode

## Quick Start: Full Stack

From the repo root:

```powershell
.\run.ps1
```

Or manually:

```bash
cd infra
docker compose up --build
```

Open:

- Frontend: check Docker output. It is usually `http://localhost:3000`, but Docker may map it to another free port such as `http://localhost:3001`.
- Backend API docs: `http://localhost:8000/docs`
- Backend health: `http://localhost:8000/health`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

The backend allows local frontend origins on any port, so `localhost:3000`, `localhost:3001`, and similar local dev ports can call the API.

## Quick Start: Backend Only

```bash
cd backend
uv --system-certs sync
uv run uvicorn app.main:app --reload
```

Open:

```text
http://localhost:8000/docs
```

On Windows, from the repo root:

```powershell
.\run.ps1 -Mode backend
```

Backend-only mode uses local SQLite by default, so documents, cost records, and evaluation records survive restarts in:

```text
backend/knowledge.db
```

Install `uv` if needed:

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

## Quick Start: Frontend Only

```bash
cd frontend
pnpm install
pnpm dev
```

Or from the repo root:

```powershell
.\run.ps1 -Mode frontend
```

The frontend expects the backend at:

```text
http://localhost:8000
```

## API Examples

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
  -d "{\"question\":\"How many days can employees work remotely?\",\"preferred_quality\":\"balanced\",\"top_k\":5}"
```

## Mock Users

- `u-admin`: admin, IT, restricted clearance
- `u-hr`: employee and knowledge manager, HR, internal clearance
- `u-employee`: employee, Engineering, internal clearance

Pass the selected user with the `X-User-Id` header. The frontend also includes a user selector.

## Phases And Modules

### Phase 0: Reference Skeleton

Status: done.

Delivered modules:

- API shell
- Mock RBAC
- Ingestion service
- Chunking service
- Retrieval placeholder
- Mock LLM provider
- Model router
- Guardrails placeholder
- Cost tracker
- Evaluation hook
- Basic frontend
- Docker Compose
- Interview and architecture docs

### Phase 1: Persistent RAG Foundation

Status: partially done.

Delivered modules:

- SQLAlchemy database setup
- Document repository
- Cost repository
- Evaluation repository
- SQLite local persistence
- PostgreSQL-compatible Docker persistence
- Demo seed data
- `uv` backend workflow
- `pnpm` frontend workflow
- Improved chat/admin frontend
- Local CORS support for changing frontend ports

Remaining modules:

- Alembic migrations
- Audit log repository
- Embedding provider abstraction
- pgvector embedding storage
- Basic vector search
- Metadata-filtered retrieval query layer

### Phase 2: Real Ingestion Pipeline

Planned modules:

- File upload endpoint
- Parser interface
- PDF parser
- Office parser
- Markdown and HTML parsers
- Source connector interface
- Redis-backed ingestion queue
- Celery worker service
- Idempotent ingestion jobs
- Document versioning
- Deletion and tombstone handling

### Phase 3: Retrieval Quality

Planned modules:

- Hybrid lexical + semantic retrieval
- pgvector similarity search
- Reranking interface
- Context assembly service
- Context compression
- Citation span tracking
- No-result and low-confidence handling
- Retrieval evaluation tests

### Phase 4: LLM Providers And Streaming

Planned modules:

- Real OpenAI provider
- Anthropic provider placeholder or implementation
- Local model provider placeholder
- Streaming backend response endpoint
- Streaming frontend rendering
- Retry, timeout, and provider failover policies
- Structured response generation
- Provider tracing metadata

### Phase 5: Enterprise Security And Governance

Planned modules:

- SSO/JWT authentication
- Group and department sync
- Document-level ACL sync
- Attribute-based access control
- Audit log persistence
- DLP integration placeholder
- Secrets detection
- Output policy checks
- Prompt-injection classifier integration

### Phase 6: Observability, Evaluation, And Cost Controls

Planned modules:

- OpenTelemetry traces
- Request, retrieval, LLM, and evaluation spans
- Persisted metrics dashboard data model
- Golden evaluation datasets
- Groundedness scoring
- Citation precision scoring
- User feedback capture
- Department budgets
- Rate limits and quotas

### Phase 7: Admin And Knowledge Operations UI

Planned modules:

- Document upload screen
- Document browser
- Connector status page
- Ingestion job monitor
- Cost dashboard
- Evaluation dashboard
- Feedback review queue
- User and role demo switcher

### Phase 8: Multi-Agent Workflows

Planned modules:

- Workflow orchestration layer
- Planner agent
- Retriever agent
- Policy/compliance agent
- Evaluator agent
- Tool/action agent
- Human approval steps for sensitive actions

Agents must reuse the shared auth, retrieval, logging, cost, and evaluation services. They should not bypass the governed RAG path.

## Verification Commands

Backend:

```bash
cd backend
uv run pytest
```

Frontend:

```bash
cd frontend
pnpm exec tsc --noEmit
pnpm build
```

## Notes

- The current answer generation is mock-based. It proves orchestration, citations, and telemetry, but it does not yet call a real model.
- The current retrieval is keyword overlap, not semantic retrieval.
- The current security model is mock RBAC, not enterprise SSO/ABAC.
- The current UI includes typewriter animation, but backend responses are not streamed yet; streaming is planned for Phase 4.
