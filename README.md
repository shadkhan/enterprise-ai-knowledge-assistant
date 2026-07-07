# 🧠 Enterprise AI Knowledge Assistant

> Secure, citation-first enterprise RAG assistant with permission-aware retrieval, cost telemetry, evaluation hooks, and a modern Next.js chat experience.

![Status](https://img.shields.io/badge/status-MVP%20%2B%20Persistent%20Foundation-2563eb)
![Backend](https://img.shields.io/badge/backend-FastAPI-009688)
![Frontend](https://img.shields.io/badge/frontend-Next.js-111827)
![Python](https://img.shields.io/badge/python-uv-6b46c1)
![Node](https://img.shields.io/badge/node-pnpm-f59e0b)

## ✨ Overview

Enterprise AI Knowledge Assistant is a reference implementation for a secure enterprise RAG system. Employees can ask natural-language questions over internal knowledge, receive cited answers, and see model, token, latency, and cost telemetry.

The current project is a runnable MVP plus part of the persistent RAG foundation. It is intentionally not production-complete yet: LLM generation, retrieval quality, identity, ingestion connectors, and advanced governance controls are still planned modules.

## 🧭 Current Status

| Area | Current State |
| --- | --- |
| Backend API | FastAPI service with `/chat`, `/ingest`, `/documents`, `/health`, `/metrics/cost`, and `/evaluate` |
| Identity | Mock users with role, department, and clearance fields |
| Authorization | Permission-aware document filtering before retrieval context assembly |
| Storage | SQLAlchemy repositories with SQLite for backend-only local mode and PostgreSQL for Docker mode |
| Chunking | LangChain `RecursiveCharacterTextSplitter` |
| Document normalization | LlamaIndex `Document` objects before chunking |
| Ingestion jobs | Redis-backed queue with worker process and status API |
| Embeddings | Mock provider by default; optional Hugging Face `sentence-transformers/all-MiniLM-L6-v2` provider |
| Cache | Redis retrieval cache with short TTL and ingestion-time invalidation |
| Retrieval | Hybrid lexical + vector retrieval with pgvector on Postgres and metadata fallback on SQLite |
| LLM | Mock provider, OpenAI-compatible mock provider, and optional real OpenAI Responses API provider |
| UI | Next.js chat UI with conversation history, source panel, visible documents, user selector, quality selector, and typewriter animation |
| Observability | Structured logs plus persisted cost/evaluation records |
| Package Managers | `uv` for Python, `pnpm` for Node/Next.js |
| Infra | Docker Compose with backend, frontend, PostgreSQL + pgvector, and Redis |

## ✅ What Works Today

| Capability | Status | Notes |
| --- | --- | --- |
| Chat API | ✅ Done | Returns answer, citations, model, provider, latency, tokens, and cost |
| Document ingestion | ✅ Done | Accepts text documents through `/ingest` |
| Synthetic ingestion | ✅ Done | Generates synthetic `document`, `pdf`, `data`, `json`, and `text` content through `/synthetic/documents` |
| Async ingestion jobs | ✅ Done | `POST /ingest/jobs`, `POST /synthetic/jobs`, and `GET /ingest/jobs/{job_id}` |
| Hugging Face embeddings | ✅ Done | Optional local provider using `sentence-transformers/all-MiniLM-L6-v2` |
| Mock embeddings | ✅ Done | Default fast provider for tests and lightweight demos |
| Retrieval cache | ✅ Done | Redis-backed short-lived cache for repeated authorized searches |
| Document visibility | ✅ Done | Filters by mock user role, department, and clearance |
| Persistence | ✅ Done | Documents, chunks, costs, and evaluations persist |
| Demo seed data | ✅ Done | Seeds a `Remote Work Policy` document when DB is empty |
| Admin metrics | ✅ Done | Shows request/token/cost summary |
| Chat UI | ✅ Done | Professional chat workspace with response animation |
| Local CORS | ✅ Done | Allows local frontend ports such as `3000`, `3001`, etc. |

## 🚧 Not Production-Ready Yet

| Area | Limitation | Planned Phase |
| --- | --- | --- |
| Retrieval | Hybrid retrieval exists, but reranking and quality evaluation are still basic | Phase 3 |
| Embeddings | Hugging Face provider is optional; Docker defaults to mock unless embeddings group is installed | Phase 3 |
| LLM | Mock and OpenAI-compatible paths work; real OpenAI provider is optional and env-driven | Phase 4 |
| Streaming | UI animates text locally, but backend does not stream tokens yet | Phase 4 |
| Ingestion | No real file upload, parsing, OCR, or connector sync yet | Phase 2 |
| Security | Mock RBAC only; no SSO, ABAC, DLP, or enterprise audit trail yet | Phase 5 |
| Evaluation | Placeholder evaluator, no golden datasets or groundedness checks yet | Phase 6 |

## 🧱 Architecture At A Glance

```text
User
  ↓
Next.js Chat UI
  ↓
FastAPI /chat
  ↓
Guardrails → Model Router → Permission-Aware Retrieval → LLM Provider
  ↓
Citations + Answer + Cost + Tokens + Latency
  ↓
Persistence + Logs + Evaluation Hooks
```

## 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| Backend | FastAPI, Pydantic, SQLAlchemy |
| LangChain | Framework dependency plus `RecursiveCharacterTextSplitter` for chunking |
| Document normalization | LlamaIndex core |
| Queue/cache | Redis list, job status records, and retrieval cache |
| Embeddings | Mock provider and optional Hugging Face sentence-transformers provider |
| LLM providers | Mock, OpenAI-compatible mock, optional OpenAI SDK provider |
| Vector search | pgvector on Postgres, metadata-vector fallback on SQLite |
| Python tooling | uv |
| Frontend | Next.js, React, Tailwind CSS |
| Node tooling | pnpm |
| Database | SQLite for backend-only local mode, PostgreSQL for Docker mode |
| Vector-ready infra | pgvector |
| Queue/cache-ready infra | Redis |
| Containers | Docker Compose |

## 🚀 Quick Start: Full Stack

For a complete run-and-test walkthrough, see [`docs/user-guide.md`](docs/user-guide.md).

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

| Service | URL |
| --- | --- |
| Frontend | Check Docker output. Usually `http://localhost:3000`, sometimes `http://localhost:3001` if `3000` is busy |
| Backend API docs | `http://localhost:8000/docs` |
| Backend health | `http://localhost:8000/health` |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |

The backend allows local frontend origins on any port, so `localhost:3000`, `localhost:3001`, and similar local dev ports can call the API.

## ⚙️ Backend Only

```bash
cd backend
uv --system-certs sync
uv run uvicorn app.main:app --reload
```

Enable local Hugging Face embeddings:

```powershell
cd backend
uv --system-certs sync --group embeddings
$env:DEFAULT_EMBEDDING_PROVIDER="huggingface"
$env:EMBEDDING_MODEL="sentence-transformers/all-MiniLM-L6-v2"
uv run uvicorn app.main:app --reload
```

Build Docker images with Hugging Face embedding dependencies:

```bash
cd infra
docker compose build --build-arg INSTALL_EMBEDDINGS=true backend worker
docker compose up
```

Enable the OpenAI-compatible mock provider:

```powershell
cd backend
$env:DEFAULT_LLM_PROVIDER="openai_mock"
uv run uvicorn app.main:app --reload
```

Enable the real OpenAI provider:

```powershell
cd backend
uv --system-certs sync --group llm
$env:DEFAULT_LLM_PROVIDER="openai"
$env:OPENAI_API_KEY="your-api-key"
$env:OPENAI_CHEAP_MODEL="gpt-4o-mini"
$env:OPENAI_PREMIUM_MODEL="gpt-4o"
uv run uvicorn app.main:app --reload
```

The real provider uses the OpenAI Responses API and falls back to the OpenAI-compatible mock when `OPENAI_FALLBACK_TO_MOCK=true`.

Build Docker images with OpenAI SDK dependencies:

```bash
cd infra
docker compose build --build-arg INSTALL_LLM=true backend worker
docker compose up
```

Open:

```text
http://localhost:8000/docs
```

Windows helper:

```powershell
.\run.ps1 -Mode backend
```

Backend-only mode uses SQLite:

```text
backend/knowledge.db
```

Install `uv` if needed:

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

## 🎨 Frontend Only

```bash
cd frontend
pnpm install
pnpm dev
```

Windows helper:

```powershell
.\run.ps1 -Mode frontend
```

The frontend expects:

```text
http://localhost:8000
```

## 🔐 Mock Users

| User ID | Role | Department | Clearance |
| --- | --- | --- | --- |
| `u-admin` | admin | IT | restricted |
| `u-hr` | employee, knowledge_manager | HR | internal |
| `u-employee` | employee | Engineering | internal |

Pass the selected user with the `X-User-Id` header. The frontend also includes a user selector.

## 📡 API Examples

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

Generate synthetic content:

```bash
curl -X POST http://localhost:8000/synthetic/documents \
  -H "Content-Type: application/json" \
  -H "X-User-Id: u-admin" \
  -d "{\"content_type\":\"json\",\"topic\":\"Access Review Controls\",\"department\":\"Global\",\"classification\":\"internal\",\"count\":3,\"tags\":[\"controls\"]}"
```

Supported synthetic content types:

| Type | Purpose |
| --- | --- |
| `document` | Policy/SOP-style enterprise document |
| `pdf` | PDF-like extracted text with page sections |
| `data` | CSV-like operational dataset plus data dictionary |
| `json` | Structured JSON policy/control content |
| `text` | Plain text knowledge note |

Create an async ingestion job:

```bash
curl -X POST http://localhost:8000/ingest/jobs \
  -H "Content-Type: application/json" \
  -H "X-User-Id: u-admin" \
  -d "{\"document\":{\"title\":\"Async Policy\",\"text\":\"Async ingestion should queue, chunk, embed, and persist this document.\",\"department\":\"Global\",\"classification\":\"internal\",\"source_type\":\"manual\",\"tags\":[\"async\"]},\"generate_embeddings\":true}"
```

Create an async synthetic ingestion job:

```bash
curl -X POST http://localhost:8000/synthetic/jobs \
  -H "Content-Type: application/json" \
  -H "X-User-Id: u-admin" \
  -d "{\"synthetic\":{\"content_type\":\"data\",\"topic\":\"Quarterly Controls\",\"department\":\"Global\",\"classification\":\"internal\",\"count\":2},\"generate_embeddings\":true}"
```

Check job status:

```bash
curl http://localhost:8000/ingest/jobs/{job_id} \
  -H "X-User-Id: u-admin"
```

## 🗺️ Phase Roadmap

| Phase | Name | Status | Goal |
| --- | --- | --- | --- |
| Phase 0 | Reference Skeleton | ✅ Done | Prove the secure enterprise RAG architecture end to end |
| Phase 1 | Persistent RAG Foundation | 🟡 Partially Done | Replace in-memory behavior with durable storage and retrieval foundations |
| Phase 2 | Real Ingestion Pipeline | 🟡 Started | Support file upload, parsers, connector interfaces, and async jobs |
| Phase 3 | Retrieval Quality | 🟡 Started | Add embeddings, hybrid retrieval, reranking, and citation precision |
| Phase 4 | LLM Providers And Streaming | 🟡 Started | Add real model providers and streamed responses |
| Phase 5 | Enterprise Security And Governance | ⏳ Planned | Add SSO, ABAC, ACL sync, DLP, and audit logging |
| Phase 6 | Observability, Evaluation, And Cost Controls | ⏳ Planned | Add traces, quality gates, budgets, feedback, and dashboards |
| Phase 7 | Admin And Knowledge Operations UI | ⏳ Planned | Add document management, ingestion monitoring, and operator workflows |
| Phase 8 | Multi-Agent Workflows | ⏳ Planned | Add governed multi-step research and enterprise actions |

## 📦 Phase Modules

### Phase 0: Reference Skeleton

| Module | Status | Notes |
| --- | --- | --- |
| API shell | ✅ Done | FastAPI routes and orchestration |
| Mock RBAC | ✅ Done | User, role, department, and clearance simulation |
| Ingestion service | ✅ Done | Text ingestion flow |
| Chunking service | ✅ Done | LangChain recursive character chunking |
| LlamaIndex normalization | ✅ Done | Ingestion payloads become LlamaIndex `Document` objects before chunking |
| Retrieval placeholder | ✅ Done | Keyword overlap search |
| Mock LLM provider | ✅ Done | Citation-aware mock answer |
| OpenAI-compatible mock provider | ✅ Done | Tests OpenAI-shaped prompt construction, routing, fallback, and cost tracking without API calls |
| Model router | ✅ Done | Rules-based cheap/premium routing |
| Guardrails placeholder | ✅ Done | Prompt-injection and PII placeholder checks |
| Cost tracker | ✅ Done | Token, latency, and cost estimation |
| Evaluation hook | ✅ Done | Placeholder quality evaluator |
| Basic frontend | ✅ Done | Chat and admin screens |
| Docker Compose | ✅ Done | Backend, frontend, Postgres, Redis |
| Docs | ✅ Done | Architecture, roadmap, interview explanation |

### Phase 1: Persistent RAG Foundation

| Module | Status | Notes |
| --- | --- | --- |
| SQLAlchemy database setup | ✅ Done | Shared database engine/session |
| Document repository | ✅ Done | Persistent documents and chunks |
| Cost repository | ✅ Done | Persistent cost records |
| Evaluation repository | ✅ Done | Persistent evaluation records |
| SQLite local persistence | ✅ Done | Backend-only mode |
| PostgreSQL Docker persistence | ✅ Done | Full-stack mode |
| Demo seed data | ✅ Done | Seeds usable policy data |
| uv backend workflow | ✅ Done | `pyproject.toml` and `uv.lock` |
| pnpm frontend workflow | ✅ Done | `pnpm-lock.yaml` |
| Improved chat/admin frontend | ✅ Done | Better UI, typewriter animation, source panels |
| Local CORS support | ✅ Done | Supports changing frontend ports |
| Synthetic content generation | ✅ Done | Generates document, PDF-like, data, JSON, and text content for demos/tests |
| Mock embedding provider | ✅ Done | Deterministic embedding interface for ingestion tests and demos |
| Retrieval cache | ✅ Done | Redis-backed cache cleared after ingestion |
| Alembic migrations | ⏳ Planned | Needed before production-style DB changes |
| Audit log repository | ⏳ Planned | Persist sensitive access events |
| Embedding provider abstraction | ✅ Done | Mock and Hugging Face providers |
| pgvector embedding storage | ✅ Done | Postgres `document_chunks.embedding vector(384)` |
| Basic vector search | ✅ Done | pgvector on Postgres, metadata fallback on SQLite |
| Metadata-filtered query layer | ⏳ Planned | DB-level filters by department/classification/ACL |

### Phase 2: Real Ingestion Pipeline

| Module | Status | Notes |
| --- | --- | --- |
| Redis ingestion queue | ✅ Done | Queue messages are stored in Redis |
| Worker service | ✅ Done | Docker Compose includes a backend worker process |
| Job status API | ✅ Done | `queued`, `running`, `completed`, and `failed` states |
| Async document ingestion job | ✅ Done | `POST /ingest/jobs` |
| Async synthetic ingestion job | ✅ Done | `POST /synthetic/jobs` |
| Mock embedding generation | ✅ Done | Runs during sync and async ingestion |
| Retrieval cache | ✅ Done | Caches repeated authorized search results for a short TTL |
| File upload endpoint | ⏳ Planned | Admin file ingestion |
| Parser interface | ⏳ Planned | Common parser contract |
| PDF parser | ⏳ Planned | Text extraction from PDF |
| Office parser | ⏳ Planned | DOCX/PPTX/XLSX support |
| Markdown and HTML parsers | ⏳ Planned | Web/docs content |
| Source connector interface | ⏳ Planned | Common connector contract |
| Celery worker service | ⏳ Planned | Optional production-grade worker upgrade |
| Idempotent ingestion jobs | ⏳ Planned | Safe retries |
| Document versioning | ⏳ Planned | Track source revisions |
| Deletion and tombstone handling | ⏳ Planned | Prevent stale/deleted docs surfacing |

### Phase 3: Retrieval Quality

| Module | Status | Notes |
| --- | --- | --- |
| Hybrid lexical + semantic retrieval | ✅ Done | Weighted lexical + vector ranking |
| pgvector similarity search | ✅ Done | Semantic search foundation for Postgres |
| Reranking interface | ⏳ Planned | Improve final context precision |
| Context assembly service | ⏳ Planned | Centralize context packing |
| Context compression | ⏳ Planned | Reduce token cost |
| Citation span tracking | ⏳ Planned | More trustworthy citations |
| No-result handling | ⏳ Planned | Avoid fabricated answers |
| Low-confidence handling | ⏳ Planned | Clarify/escalate uncertain answers |
| Retrieval evaluation tests | ⏳ Planned | Measure recall and precision |

### Phase 4: LLM Providers And Streaming

| Module | Status | Notes |
| --- | --- | --- |
| Real OpenAI provider | ✅ Done | Optional SDK provider using the Responses API with mock fallback |
| OpenAI-compatible mock provider | ✅ Done | Tests prompt construction, routing, fallback, and cost tracking without API calls |
| Provider fallback | ✅ Done | Real OpenAI path can fall back to OpenAI-compatible mock |
| Anthropic provider | ⏳ Planned | Optional second provider |
| Local model provider | ⏳ Planned | Optional self-hosted path |
| Streaming backend endpoint | ⏳ Planned | Token/event streaming from API |
| Streaming frontend rendering | ⏳ Planned | Real streamed text, not local-only animation |
| Retry and timeout policies | ⏳ Planned | Provider resilience |
| Provider failover | ⏳ Planned | Fallback across providers/models |
| Structured response generation | ⏳ Planned | Typed answer/citation payloads |
| Provider tracing metadata | ⏳ Planned | Model call observability |

### Phase 5: Enterprise Security And Governance

| Module | Status | Notes |
| --- | --- | --- |
| SSO/JWT authentication | ⏳ Planned | Real enterprise identity |
| Group and department sync | ⏳ Planned | Mirror enterprise directory state |
| Document-level ACL sync | ⏳ Planned | Source-specific permissions |
| Attribute-based access control | ⏳ Planned | Fine-grained policy evaluation |
| Audit log persistence | ⏳ Planned | Immutable sensitive-access record |
| DLP integration placeholder | ⏳ Planned | Scan inputs/outputs |
| Secrets detection | ⏳ Planned | Block leaked credentials |
| Output policy checks | ⏳ Planned | Govern generated responses |
| Prompt-injection classifier | ⏳ Planned | Stronger malicious prompt detection |

### Phase 6: Observability, Evaluation, And Cost Controls

| Module | Status | Notes |
| --- | --- | --- |
| OpenTelemetry traces | ⏳ Planned | End-to-end request visibility |
| Request/retrieval/LLM/evaluation spans | ⏳ Planned | Debug latency and failures |
| Metrics dashboard data model | ⏳ Planned | Persist dashboard-ready aggregates |
| Golden evaluation datasets | ⏳ Planned | Regression testing |
| Groundedness scoring | ⏳ Planned | Detect unsupported answers |
| Citation precision scoring | ⏳ Planned | Check cited source relevance |
| User feedback capture | ⏳ Planned | Improve quality loops |
| Department budgets | ⏳ Planned | Cost governance |
| Rate limits and quotas | ⏳ Planned | Abuse and spend control |

### Phase 7: Admin And Knowledge Operations UI

| Module | Status | Notes |
| --- | --- | --- |
| Document upload screen | ⏳ Planned | Operator ingestion UX |
| Document browser | ⏳ Planned | Search/filter managed documents |
| Connector status page | ⏳ Planned | Monitor external source sync |
| Ingestion job monitor | ⏳ Planned | Track failures and retries |
| Cost dashboard | ⏳ Planned | Spend by model/user/department |
| Evaluation dashboard | ⏳ Planned | Quality and hallucination monitoring |
| Feedback review queue | ⏳ Planned | Human review workflow |
| User and role demo switcher | ⏳ Planned | Better demo/admin controls |

### Phase 8: Multi-Agent Workflows

| Module | Status | Notes |
| --- | --- | --- |
| Workflow orchestration layer | ⏳ Planned | Governed multi-step execution |
| Planner agent | ⏳ Planned | Task decomposition |
| Retriever agent | ⏳ Planned | Source-specific lookup |
| Policy/compliance agent | ⏳ Planned | Centralized safety review |
| Evaluator agent | ⏳ Planned | Groundedness and quality checks |
| Tool/action agent | ⏳ Planned | Enterprise workflow actions |
| Human approval steps | ⏳ Planned | Required for sensitive actions |

Important constraint: agents must reuse shared auth, retrieval, logging, cost, and evaluation services. They should not bypass the governed RAG path.

## 🧪 Verification Commands

| Area | Command | Expected Result |
| --- | --- | --- |
| Backend tests | `cd backend && uv run pytest` | Test suite passes |
| Frontend type check | `cd frontend && pnpm exec tsc --noEmit` | TypeScript passes |
| Frontend production build | `cd frontend && pnpm build` | Next.js build succeeds |
| Backend health | `curl http://localhost:8000/health` | Returns `{"status":"ok",...}` |
| Docker full stack | `cd infra && docker compose up --build` | Backend, frontend, Postgres, Redis start |

## 📝 Current Mock Limitations

| Limitation | What It Means | Planned Fix |
| --- | --- | --- |
| Mock LLM default | The default provider is still mock so the app runs without API keys | Set `DEFAULT_LLM_PROVIDER=openai` and `OPENAI_API_KEY` |
| Mock embeddings | Default embeddings are deterministic demo vectors unless Hugging Face provider is enabled | Enable `DEFAULT_EMBEDDING_PROVIDER=huggingface` |
| Retrieval quality | Hybrid retrieval exists, but reranking and citation precision are still basic | Phase 3 reranking and retrieval evaluation |
| Local typewriter animation | Text animates in the UI after the full API response arrives | Phase 4 streamed backend responses |
| Mock RBAC | Access rules are demo-only and not tied to enterprise identity | Phase 5 SSO/JWT/ABAC |
| Placeholder guardrails | Prompt-injection and PII checks are simple pattern checks | Phase 5 DLP and classifier integration |
| Placeholder evaluation | Quality scoring is not dataset-backed | Phase 6 golden datasets and groundedness scoring |

## 📚 Documentation

| Document | Purpose |
| --- | --- |
| `docs/architecture.md` | System design and component responsibilities |
| `docs/user-guide.md` | Step-by-step run, test, demo, and troubleshooting guide |
| `docs/interview-explanation.md` | Interview-friendly explanation and follow-up answers |
| `docs/roadmap.md` | Short roadmap summary |
| `docs/tradeoffs.md` | Design tradeoffs |
| `docs/whiteboard.md` | Whiteboard-style architecture notes |
