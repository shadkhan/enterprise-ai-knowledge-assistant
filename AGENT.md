# Agent Guide

This file is the working guide for future AI agents and engineers extending the Enterprise AI Knowledge Assistant.

## Current Project State

The repository currently contains a production-style skeleton, not a fully productionized system.

Completed foundations:

- FastAPI backend with modular packages for API, auth, ingestion, retrieval, LLM providers, routing, security, evaluation, observability, cost, and schemas.
- API endpoints for `/chat`, `/ingest`, `/documents`, `/health`, `/metrics/cost`, and `/evaluate`.
- Mock RBAC with users, roles, departments, clearance levels, and document classification checks.
- In-memory document ingestion, metadata extraction, text chunking, and keyword-style retrieval.
- Mock LLM provider and OpenAI provider placeholder behind a provider interface.
- Rules-based model router for cheap versus premium model selection.
- Prompt-injection detection and PII redaction placeholders.
- Token, latency, model, provider, and estimated cost tracking.
- Structured JSON logging utilities.
- Evaluation placeholder for citation presence and hallucination-risk checks.
- Next.js + Tailwind frontend with chat UI, citations/source panel, cost display, latency display, and admin metrics placeholder.
- Docker Compose skeleton for backend, frontend, PostgreSQL with pgvector, and Redis.
- Documentation for architecture, whiteboard explanation, interview explanation, tradeoffs, and roadmap.

## Non-Goals For The Current Skeleton

Do not treat the current implementation as production-ready.

Not implemented yet:

- Persistent backend repositories.
- Real document upload and binary file parsing.
- Real embeddings.
- pgvector-backed vector search.
- Hybrid lexical plus semantic search.
- Enterprise SSO or real ACL sync.
- Production LLM SDK integration.
- Streaming responses.
- Queue-based ingestion workers.
- Real cost database.
- OpenTelemetry tracing.
- Full prompt-injection, DLP, and output-policy enforcement.
- Multi-agent orchestration.

## Engineering Principles

When extending the system:

- Keep modules small and separated by responsibility.
- Preserve the security-first retrieval flow: authorize before context reaches the LLM.
- Add interfaces before adding vendor-specific integrations.
- Prefer production-shaped placeholders over hardcoded demo shortcuts.
- Keep API contracts explicit through Pydantic schemas.
- Keep observability, cost, evaluation, and audit concerns visible in every new workflow.
- Use TODO comments only where a concrete production replacement is expected.
- Avoid adding multi-agent complexity until the single RAG flow is reliable.

## Module Ownership

### `backend/app/api`

Owns HTTP endpoints and request orchestration. Avoid placing business logic directly in route handlers when it belongs in a service module.

Next work:

- Add request IDs.
- Add response streaming endpoint.
- Add admin ingestion and evaluation APIs.

### `backend/app/auth`

Owns user identity and access decisions.

Next work:

- Replace mock users with SSO/JWT integration.
- Add group and document ACL sync.
- Add ABAC policy evaluation.

### `backend/app/ingestion`

Owns document intake, parsing, metadata extraction, chunking, and indexing handoff.

Next work:

- Add upload support.
- Add parser interfaces.
- Add async ingestion jobs.
- Add source connector abstractions.

### `backend/app/retrieval`

Owns knowledge search and context assembly.

Next work:

- Add PostgreSQL repositories.
- Add pgvector search.
- Add hybrid search and reranking.
- Add context compression.

### `backend/app/llm`

Owns provider-neutral LLM calls.

Next work:

- Add real OpenAI provider.
- Add Anthropic/local provider placeholders.
- Add retries, timeouts, structured output, and streaming.

### `backend/app/routing`

Owns model/provider selection.

Next work:

- Expand task classification.
- Add routing by budget, latency SLO, department policy, and risk.
- Persist routing outcomes for later adaptive routing.

### `backend/app/security`

Owns guardrails, prompt-injection checks, PII redaction, and future DLP integration.

Next work:

- Add policy-driven input/output checks.
- Add source trust scoring.
- Add secrets and sensitive-data detectors.

### `backend/app/evaluation`

Owns answer quality hooks.

Next work:

- Add groundedness checks.
- Add citation precision scoring.
- Add golden dataset evaluation.
- Add CI regression gates.

### `backend/app/cost`

Owns token usage and cost accounting.

Next work:

- Persist records.
- Add per-team budgets.
- Add rate limits and quota enforcement.

### `backend/app/observability`

Owns logs, metrics, traces, and audit-friendly events.

Next work:

- Add trace IDs.
- Add OpenTelemetry.
- Add request/retrieval/LLM timing spans.

### `frontend`

Owns user and admin experience.

Next work:

- Add ingestion admin screen.
- Add document browser.
- Add feedback controls.
- Add streaming response UX.
- Add auth/user switcher for demos.

### `infra`

Owns local and deployment infrastructure.

Next work:

- Add backend migrations.
- Add worker service.
- Add observability stack.
- Add production environment examples.

## Recommended Next Implementation Order

1. Add persistent PostgreSQL repositories for documents, chunks, costs, and evaluations.
2. Add embeddings and pgvector-backed retrieval.
3. Add real file ingestion with parser interfaces.
4. Add queue workers for ingestion and embedding jobs.
5. Add real LLM providers and streaming.
6. Add enterprise auth and ACL enforcement.
7. Add evaluation datasets and observability.
8. Add multi-agent workflow orchestration only after the governed RAG path is stable.

