# User Guide

This guide explains how anyone can run, test, and demo the Enterprise AI Knowledge Assistant from a fresh checkout.

## 1. Prerequisites

| Tool | Required For | Check Command |
| --- | --- | --- |
| Git | Clone the repository | `git --version` |
| Docker Desktop | Easiest full-stack run | `docker --version` |
| Docker Compose | Backend, frontend, Postgres, Redis | `docker compose version` |
| uv | Local Python backend workflow | `uv --version` |
| Node.js | Local Next.js frontend workflow | `node --version` |
| pnpm | Local frontend package manager | `pnpm --version` |

Recommended path for most users: use Docker first. It starts the backend, frontend, PostgreSQL with pgvector, and Redis together.

Install `uv` on Windows if needed:

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

Enable `pnpm` through Corepack if needed:

```powershell
corepack enable
corepack prepare pnpm@latest --activate
```

## 2. Clone The Project

```powershell
git clone https://github.com/shadkhan/enterprise-ai-knowledge-assistant.git
cd enterprise-ai-knowledge-assistant
```

## 3. Run The Full Stack

From the project root:

```powershell
.\run.ps1
```

Equivalent manual command:

```powershell
cd infra
docker compose up --build
```

Open these URLs:

| Service | URL |
| --- | --- |
| Frontend app | `http://localhost:3000` |
| Backend API docs | `http://localhost:8000/docs` |
| Backend health check | `http://localhost:8000/health` |

If port `3000` is busy, Docker or Next.js may use another local port such as `3001`. Check the terminal output.

## 4. Run Backend Only

Use this when you only want to test APIs and backend behavior.

```powershell
.\run.ps1 -Mode backend
```

Manual backend run:

```powershell
cd backend
uv --system-certs sync
uv run uvicorn app.main:app --reload
```

Backend-only mode uses local SQLite at:

```text
backend/knowledge.db
```

Open:

```text
http://localhost:8000/docs
```

## 5. Run Frontend Only

Start the backend first, then run:

```powershell
.\run.ps1 -Mode frontend
```

Manual frontend run:

```powershell
cd frontend
pnpm install
pnpm dev
```

The frontend expects the backend at:

```text
http://localhost:8000
```

## 6. Optional Hugging Face Embeddings

The default embedding provider is `mock`, which is fast and lightweight for demos and tests.

To use the free open-source Hugging Face model locally:

```powershell
cd backend
uv --system-certs sync --group embeddings
$env:DEFAULT_EMBEDDING_PROVIDER="huggingface"
$env:EMBEDDING_MODEL="sentence-transformers/all-MiniLM-L6-v2"
uv run uvicorn app.main:app --reload
```

| Item | Detail |
| --- | --- |
| Default model | `sentence-transformers/all-MiniLM-L6-v2` |
| Dimensions | `384` |
| Local behavior | The first run downloads the model and may take longer |
| Docker default | Uses mock embeddings unless the embedding dependency group is installed |

Build Docker backend and worker images with embedding dependencies:

```powershell
cd infra
docker compose build --build-arg INSTALL_EMBEDDINGS=true backend worker
docker compose up
```

## 7. Optional OpenAI Providers

The default LLM provider is `mock`, which keeps the project free and deterministic.

Use the OpenAI-compatible mock when you want to test OpenAI routing, prompt shape, fallback, and cost behavior without calling the external API:

```powershell
cd backend
$env:DEFAULT_LLM_PROVIDER="openai_mock"
uv run uvicorn app.main:app --reload
```

Use the real OpenAI provider when you have an API key:

```powershell
cd backend
uv --system-certs sync --group llm
$env:DEFAULT_LLM_PROVIDER="openai"
$env:OPENAI_API_KEY="your-api-key"
$env:OPENAI_CHEAP_MODEL="gpt-4o-mini"
$env:OPENAI_PREMIUM_MODEL="gpt-4o"
uv run uvicorn app.main:app --reload
```

| Provider | API Calls | Good For |
| --- | --- | --- |
| `mock` | No | Fast local demos and tests |
| `openai_mock` | No | OpenAI-shaped integration testing |
| `openai` | Yes | Real LLM answers with fallback support |

By default, `OPENAI_FALLBACK_TO_MOCK=true`, so missing keys, missing SDK dependencies, or API failures fall back to the OpenAI-compatible mock provider.

## 8. Semantic Cache

Semantic cache is enabled by default. It stores completed chat answers in Redis using the question embedding and a strict permission-aware scope.

| Setting | Default | Purpose |
| --- | --- | --- |
| `SEMANTIC_CACHE_ENABLED` | `true` | Enables answer reuse for similar questions |
| `SEMANTIC_CACHE_TTL_SECONDS` | `3600` | Keeps semantic answers for one hour |
| `SEMANTIC_CACHE_SIMILARITY_THRESHOLD` | `0.94` | Requires high semantic similarity before reuse |
| `SEMANTIC_CACHE_MAX_SCAN` | `200` | Limits Redis entries scanned per request |

Cache scope includes user ID, roles, department, clearance, provider, model, and `top_k`. This keeps cached answers inside the same permission and routing boundary.

When semantic cache hits, `/chat` returns `semantic_cache_hit=true`, zero current-call tokens, and zero current-call estimated cost. The frontend also shows a `Cache` metric on cached assistant messages.

Ingestion clears both retrieval cache and semantic answer cache so new or changed documents can be discovered.

## 9. Test The Application In The UI

1. Open the frontend.
2. Select a user from the user selector.
3. Ask:

```text
How many days can employees work remotely?
```

Expected behavior:

| What To Check | Expected Behavior |
| --- | --- |
| Answer | Assistant returns a policy-style answer |
| Citations | Source panel shows retrieved document chunks |
| Animation | Text appears with local typewriter animation |
| Telemetry | Model, provider, token, latency, and cost fields are visible |
| Authorization | Different users see only documents allowed by mock RBAC |

Recommended users:

| User ID | Good For |
| --- | --- |
| `u-admin` | Full admin demo and ingestion |
| `u-hr` | HR/internal access checks |
| `u-employee` | Normal employee access checks |
| `u-finance` | Finance restricted-access demo |
| `u-legal` | Legal restricted-access demo |

## 10. Test Admin Pages

Start the frontend and backend, then open:

| Page | URL |
| --- | --- |
| Metrics | `http://localhost:3000/admin` |
| Users | `http://localhost:3000/admin/users` |
| Authentication | `http://localhost:3000/admin/authentication` |
| Settings | `http://localhost:3000/admin/settings` |
| Governance | `http://localhost:3000/admin/governance` |

The admin pages call backend APIs as `u-admin`. The current authentication model is mock header authentication through `X-User-Id`; real SSO/OIDC/SAML is planned for a later phase.

## 11. Test The Backend APIs

Health check:

```powershell
curl http://localhost:8000/health
```

Expected response includes:

```json
{"status":"ok"}
```

Ingest a document:

```powershell
curl -X POST http://localhost:8000/ingest `
  -H "Content-Type: application/json" `
  -H "X-User-Id: u-admin" `
  -d "{\"title\":\"Remote Work Policy\",\"text\":\"Employees may work remotely two days per week with manager approval.\",\"department\":\"Global\",\"classification\":\"internal\",\"source_type\":\"confluence\",\"tags\":[\"policy\"]}"
```

Ask a question:

```powershell
curl -X POST http://localhost:8000/chat `
  -H "Content-Type: application/json" `
  -H "X-User-Id: u-employee" `
  -d "{\"question\":\"How many days can employees work remotely?\",\"preferred_quality\":\"balanced\",\"top_k\":5}"
```

Generate synthetic documents:

```powershell
curl -X POST http://localhost:8000/synthetic/documents `
  -H "Content-Type: application/json" `
  -H "X-User-Id: u-admin" `
  -d "{\"content_type\":\"json\",\"topic\":\"Access Review Controls\",\"department\":\"Global\",\"classification\":\"internal\",\"count\":3,\"tags\":[\"controls\"]}"
```

Create an async ingestion job:

```powershell
curl -X POST http://localhost:8000/ingest/jobs `
  -H "Content-Type: application/json" `
  -H "X-User-Id: u-admin" `
  -d "{\"document\":{\"title\":\"Async Policy\",\"text\":\"Async ingestion should queue, chunk, embed, and persist this document.\",\"department\":\"Global\",\"classification\":\"internal\",\"source_type\":\"manual\",\"tags\":[\"async\"]},\"generate_embeddings\":true}"
```

Check a job:

```powershell
curl http://localhost:8000/ingest/jobs/YOUR_JOB_ID `
  -H "X-User-Id: u-admin"
```

Review cost metrics:

```powershell
curl http://localhost:8000/metrics/cost `
  -H "X-User-Id: u-admin"
```

List mock users:

```powershell
curl http://localhost:8000/admin/users `
  -H "X-User-Id: u-admin"
```

Review governance settings:

```powershell
curl http://localhost:8000/admin/governance `
  -H "X-User-Id: u-admin"
```

## 12. Run Automated Checks

Backend tests:

```powershell
cd backend
uv --system-certs run pytest
```

Expected result:

```text
6 passed
```

Frontend type check:

```powershell
cd frontend
pnpm install
pnpm exec tsc --noEmit
```

Frontend production build:

```powershell
cd frontend
pnpm build
```

Docker Compose validation:

```powershell
cd infra
docker compose config --quiet
```

## 13. Troubleshooting

| Problem | Likely Cause | Fix |
| --- | --- | --- |
| Frontend says it cannot reach API | Backend is not running or is on another port | Open `http://localhost:8000/health` and restart backend |
| `/health` works but chat fails | Browser/frontend may be calling a different API URL | Restart frontend after backend is running |
| Port `3000` is busy | Another frontend is running | Use the port shown in terminal output |
| Port `8000` is busy | Another backend is running | Stop the old process or change the backend port |
| Docker push fails with large `.pnpm-store` files | Local package store was accidentally committed | Remove `.pnpm-store` from git history and keep it ignored |
| Hugging Face run is slow first time | Model download and dependency loading | Wait for first model download to complete |
| OpenAI provider returns mock-style answer | Fallback is enabled, API key is missing, or SDK is not installed | Run `uv --system-certs sync --group llm` and set `OPENAI_API_KEY` |
| `http://localhost:11434` does not open | That is an Ollama API port, not this project's web preview | Ignore it unless you separately install and run Ollama; this project uses `3000/3001` for frontend and `8000` for backend |
| Semantic cache does not hit | Redis is not running, cache is cold, or similarity is below threshold | Ask the same or very similar question twice with the same user/model route |
| Redis job stays queued | Worker is not running | Use Docker full stack or start `python -m app.worker` with backend environment |

## 14. What Is Mocked Today

| Area | Current Behavior |
| --- | --- |
| LLM default | Mock provider returns grounded demo answers unless `DEFAULT_LLM_PROVIDER` is changed |
| OpenAI fallback | Real OpenAI provider can fall back to OpenAI-compatible mock |
| Default embeddings | Mock vectors unless Hugging Face provider is enabled |
| Semantic cache | Uses mock or Hugging Face embeddings depending on `DEFAULT_EMBEDDING_PROVIDER` |
| Streaming | UI animates full responses locally; backend token streaming is planned |
| Identity | Mock users and RBAC, not real SSO |
| Admin settings | Read-only mock settings and governance pages |
| Evaluation | Basic placeholder scoring |

This means the project is suitable for architecture demos, API testing, ingestion flow testing, retrieval flow testing, and frontend walkthroughs. Production-grade SSO, real model calls, real file parsers, reranking, streaming, and stronger governance are planned phases.
