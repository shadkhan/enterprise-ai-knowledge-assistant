# Architecture

## Purpose

The Enterprise AI Knowledge Assistant lets employees ask natural-language questions over internal knowledge while preserving access controls, citations, observability, cost control, and future extensibility.

This repository is a reference skeleton. It uses mock providers and in-memory stores so the architecture is easy to inspect and run. The `infra/` folder shows the intended production dependencies: PostgreSQL with pgvector, Redis, and containerized services.

## High-level flow

1. A user submits a question to `POST /chat`.
2. The API resolves the mock user from `X-User-Id`.
3. Security guardrails inspect the prompt for injection patterns and redact obvious PII.
4. The model router selects a cheap or premium model based on query complexity and requested quality.
5. Retrieval searches authorized document chunks only.
6. The LLM provider generates an answer from retrieved context.
7. The response includes citations, token usage, latency, model/provider, and estimated cost.
8. Structured JSON logs emit observability-friendly events.
9. Evaluation hooks can score the answer after generation.

## Components

### API

FastAPI exposes:

- `POST /chat`: permission-aware RAG answer generation
- `POST /ingest`: document ingestion for admins and knowledge managers
- `GET /documents`: visible documents for current user
- `GET /health`: liveness endpoint
- `GET /metrics/cost`: admin cost summary
- `POST /evaluate`: answer quality evaluation hook

### Auth and authorization

The skeleton uses mock RBAC:

- users have roles, departments, and clearance levels
- documents have department and classification metadata
- retrieval filters documents before ranking

Production systems should integrate SSO, SCIM, group sync, document-level ACLs, attribute-based access control, and immutable audit logs.

### Ingestion

The ingestion module accepts raw text, extracts metadata, chunks content, and stores document summaries/chunks in memory.

Production ingestion would add:

- source connectors for SharePoint, Confluence, Jira, Google Drive, S3, and internal KBs
- file parsers for PDF, Office, HTML, Markdown, and scanned OCR
- deduplication, versioning, and deletion propagation
- asynchronous workers via Celery and Redis
- embeddings written to pgvector

### Retrieval

The current retrieval service uses keyword overlap as a placeholder. The intended design is hybrid retrieval:

- metadata filter by tenant, department, ACL, classification, freshness, and source
- lexical search for exact policy names, IDs, ticket keys, and acronyms
- vector search for semantic recall
- reranking for final context ordering

The most important production rule is security-first retrieval: filter unauthorized documents before they can reach the model context.

### LLM abstraction

The `llm` package defines a provider interface and mock/OpenAI placeholder providers. This keeps request orchestration independent from vendor-specific SDKs.

Production providers should support retries, timeouts, streaming, tool calls, structured output, safety settings, and tracing metadata.

### Model routing

The router chooses between `cheap-fast-model` and `premium-reasoning-model`. The current rule checks query length and complexity keywords.

In production, routing can use task type, expected value, latency SLO, department policy, user role, context size, historical quality, and current budget.

### Security

The skeleton includes simple prompt-injection detection and PII redaction placeholders.

Production controls should include:

- source trust scoring
- instruction hierarchy and context isolation
- DLP scanning
- secrets detection
- output policy enforcement
- jailbreak and data-exfiltration classifiers
- audit logging for sensitive queries

### Evaluation

The evaluator currently checks citation presence and uncertainty language. Production evaluation should include:

- golden question datasets
- groundedness and citation precision checks
- answer completeness scoring
- hallucination detection
- regression gates in CI
- online feedback loops

### Cost and observability

Cost tracking records provider, model, prompt tokens, completion tokens, latency, and estimated cost. Logs are JSON-formatted and designed for ingestion into ELK, Datadog, Splunk, OpenTelemetry collectors, or cloud logging.

Production telemetry should also include trace IDs, retrieval timings, reranker timings, cache hits, queue duration, error classes, user/tenant dimensions, and model response safety outcomes.

## Data stores

PostgreSQL stores document metadata, chunks, audit logs, costs, and evaluations. pgvector stores embeddings beside chunk metadata. Redis supports caching, rate limiting, distributed locks, and queue infrastructure.

## Future multi-agent extension

The current orchestration is intentionally linear. To evolve into multi-agent workflows, add a workflow layer above retrieval and LLM providers:

- planner agent for task decomposition
- retriever agent for source-specific lookup
- policy agent for access and compliance checks
- evaluator agent for groundedness review
- action agent for ticket creation or workflow updates

Keep shared services such as auth, retrieval, cost tracking, and logging outside agents so governance remains centralized.

