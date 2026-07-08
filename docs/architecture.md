# Architecture

## Purpose

The Enterprise AI Knowledge Assistant lets employees ask natural-language questions over internal knowledge while preserving access controls, citations, observability, cost control, and future extensibility.

This repository is a reference skeleton. It uses mock providers so the architecture is easy to inspect and run, while documents, chunks, costs, and evaluations are stored through a SQLAlchemy repository layer. Backend-only development uses SQLite by default; the `infra/` folder shows the PostgreSQL with pgvector, Redis, and containerized full-stack path.

The ingestion foundation now uses LangChain and LlamaIndex:

- LangChain's `RecursiveCharacterTextSplitter` handles chunking.
- LlamaIndex `Document` objects normalize ingested content before chunking.
- A synthetic content generator creates demo/test material for document, PDF-like, data, JSON, and plain text content.
- Redis-backed ingestion jobs let the API enqueue work for a separate worker process.
- Embedding providers support deterministic mock vectors by default and optional local Hugging Face embeddings with `sentence-transformers/all-MiniLM-L6-v2`.
- Redis also provides a short-lived retrieval cache for repeated authorized searches.

## High-level flow

1. A user submits a question to `POST /chat`.
2. The API resolves the mock user from `X-User-Id`.
3. Security guardrails inspect the prompt for injection patterns and redact obvious PII.
4. The model router selects a cheap or premium model based on query complexity and requested quality.
5. Retrieval searches authorized document chunks only.
6. The LLM provider generates an answer from retrieved context. The provider can be the default mock, an OpenAI-compatible mock, or the real OpenAI Responses API provider.
7. The response includes citations, token usage, latency, model/provider, and estimated cost.
8. Structured JSON logs emit observability-friendly events.
9. Evaluation hooks can score the answer after generation.

## Components

### Mock identity and admin APIs

The demo uses five mock enterprise users resolved from the `X-User-Id` header. Each user has email, roles, department, clearance, status, auth provider, and last-login metadata.

Admin-only endpoints expose users, authentication settings, runtime settings, governance policy summaries, document inventory, document detail, and ingestion job status. These endpoints establish the API shape for future SSO, ABAC, audit, policy administration, and knowledge operations.

The knowledge operations UI adds document inventory, chunk inspection, ingestion job creation, synthetic content generation, and job monitoring. This gives admins a closed loop from adding knowledge to validating retrieval behavior.

### API

FastAPI exposes:

- `POST /chat`: permission-aware RAG answer generation
- `POST /ingest`: document ingestion for admins and knowledge managers
- `POST /synthetic/documents`: generate and ingest synthetic document, PDF-like, data, JSON, or text content
- `POST /ingest/jobs`: enqueue an asynchronous document ingestion job
- `POST /synthetic/jobs`: enqueue an asynchronous synthetic ingestion job
- `GET /ingest/jobs/{job_id}`: inspect ingestion job status
- `GET /documents`: visible documents for current user
- `GET /auth/me`: current mock user profile
- `GET /admin/documents`: admin-only document inventory with chunk counts
- `GET /admin/documents/{document_id}`: admin-only document detail and chunks
- `GET /admin/ingest/jobs`: admin-only ingestion job monitor
- `GET /admin/users`: admin-only mock user directory
- `GET /admin/authentication`: admin-only authentication configuration
- `GET /admin/settings`: admin-only runtime settings summary
- `GET /admin/governance`: admin-only governance policy summary
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

The ingestion module accepts raw text, extracts metadata, normalizes the payload into a LlamaIndex `Document`, chunks content with LangChain, and stores document summaries/chunks through the repository layer.

Current ingestion flow:

1. `POST /ingest` receives a `DocumentCreate` payload.
2. Metadata is extracted from title, source type, department, classification, and tags.
3. The payload is converted into a LlamaIndex `Document`.
4. LangChain `RecursiveCharacterTextSplitter` splits the document text into overlapping chunks.
5. The mock embedding provider generates deterministic embeddings for each chunk.
6. SQLAlchemy repositories persist the document summary and chunks, including embedding metadata.

Async ingestion flow:

1. `POST /ingest/jobs` or `POST /synthetic/jobs` creates a Redis-backed job record.
2. The API pushes a job message onto the ingestion queue.
3. The worker process pops queued jobs from Redis.
4. The worker runs the same normalization, chunking, embedding, and persistence path as synchronous ingestion.
5. Job status moves through `queued`, `running`, `completed`, or `failed`.

The project also exposes `POST /synthetic/documents` for demo and test content. It can generate:

- `document`: policy/SOP-style enterprise content
- `pdf`: PDF-like extracted text with page sections
- `data`: CSV-like operational data plus a data dictionary
- `json`: structured control/policy data
- `text`: plain text knowledge notes

Production ingestion would add:

- source connectors for SharePoint, Confluence, Jira, Google Drive, S3, and internal KBs
- file parsers for PDF, Office, HTML, Markdown, and scanned OCR
- deduplication, versioning, and deletion propagation
- asynchronous workers via Celery and Redis
- embeddings written to pgvector

### Embeddings And Retrieval

The current retrieval service reads persisted LangChain-created chunks and supports hybrid lexical + vector retrieval. In lightweight SQLite mode, vectors are stored in chunk metadata and searched with an in-process cosine fallback. In PostgreSQL mode, embeddings are written to `document_chunks.embedding vector(384)` and searched with pgvector cosine distance.

Embedding providers:

- `mock`: deterministic local vectors for tests and fast demos
- `huggingface`: optional local `sentence-transformers/all-MiniLM-L6-v2` embeddings

The intended production design continues to evolve toward higher-quality hybrid retrieval:

- metadata filter by tenant, department, ACL, classification, freshness, and source
- lexical search for exact policy names, IDs, ticket keys, and acronyms
- vector search for semantic recall through pgvector
- optional BGE reranking for final context ordering

The most important production rule is security-first retrieval: filter unauthorized documents before they can reach the model context.

### Reranking

Reranking is optional and disabled by default for lightweight local runs. When enabled, retrieval first gathers a larger candidate pool from lexical/vector search, then an open-source cross-encoder scores `(question, chunk)` pairs and returns the best chunks to the LLM.

Recommended default:

```text
BAAI/bge-reranker-base
```

Decision reasoning:

| Reranker | Why Use It | Tradeoff |
| --- | --- | --- |
| `BAAI/bge-reranker-base` | Strong open-source RAG baseline and practical local default | More CPU/RAM than vector-only retrieval |
| `BAAI/bge-reranker-large` | Better quality ceiling | Slower, larger, less friendly for small machines |
| `cross-encoder/ms-marco-MiniLM-L-6-v2` | Very fast local baseline | Weaker relevance quality for enterprise RAG |
| Hosted rerank APIs | Managed, strong quality | Paid and external |

The code uses a reranker abstraction so BGE can be swapped later. If the reranker model or dependency is unavailable, retrieval falls back to the existing hybrid order.

Current caching behavior:

- Retrieval results are cached in Redis using the query, user identity, roles, department, clearance, and `top_k`.
- Cache entries have a short TTL.
- Ingestion clears retrieval cache entries so newly ingested documents can be discovered.
- If Redis is unavailable, retrieval still works without caching.

### Semantic answer cache

The chat endpoint also has a Redis-backed semantic answer cache. After authorization-aware retrieval and model routing, the API embeds the sanitized question, searches cache entries in the same user/provider/model scope, and reuses the best answer only when similarity is above the configured threshold.

| Cache Dimension | Current Behavior |
| --- | --- |
| Scope | User ID, roles, department, clearance, provider, model, and `top_k` |
| Similarity | Cosine similarity over the configured embedding provider |
| TTL | Controlled by `SEMANTIC_CACHE_TTL_SECONDS` |
| Invalidation | Cleared after document ingestion |
| Failure mode | If Redis or embeddings fail, the request continues without semantic cache |

On a hit, the API returns the cached answer with `semantic_cache_hit=true`, zero current-call tokens, and zero current-call estimated cost.

### LLM abstraction

The `llm` package defines a provider interface plus three current implementations:

| Provider | Purpose |
| --- | --- |
| `mock` | Fast deterministic local provider for demos and tests |
| `openai_mock` | OpenAI-shaped mock that validates prompt construction, routing, fallback, and cost tracking without external calls |
| `openai` | Optional real OpenAI SDK provider using the Responses API |

The model router selects provider-specific cheap and premium model names from configuration. The real OpenAI provider uses retrieved authorized context as input and can fall back to `openai_mock` when the API key, SDK, network, or provider call is unavailable.

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

The next planned evaluation layer is a control plane with four parts:

| Layer | What | Why | How | Result |
| --- | --- | --- | --- | --- |
| Offline evaluation | Golden question datasets and repeatable tests | Catch retrieval, citation, and access-control regressions before release | Store golden cases in the repo and run them through pytest | Quality gates become part of CI |
| Online evaluation | Score real answers after generation | Detect hallucination and weak citations in live usage | Persist groundedness, citation, uncertainty, and evaluator notes | Admins can review risky answers |
| Monitoring | Track cost, documents, evaluations, feedback, feature flags, and ingestion behavior | Make production behavior observable | `/metrics/runtime` and `/admin/monitoring` | Faster debugging and cost governance |
| User feedback | Capture thumbs up/down and comments | Add human judgment to automated checks | Store feedback and expose `/admin/feedback` | Better prompts, retrieval tuning, and content fixes |

We do not just build RAG. We measure retrieval quality, answer groundedness, citations, access-control leakage, latency, cost, and user feedback.

### Cost and observability

Cost tracking records provider, model, prompt tokens, completion tokens, latency, and estimated cost. Logs are JSON-formatted and designed for ingestion into ELK, Datadog, Splunk, OpenTelemetry collectors, or cloud logging.

Production telemetry should also include trace IDs, retrieval timings, reranker timings, cache hits, queue duration, error classes, user/tenant dimensions, and model response safety outcomes.

## Data stores

PostgreSQL stores document metadata, chunks, audit logs, costs, and evaluations. pgvector stores embeddings beside chunk metadata. Redis supports caching, rate limiting, distributed locks, and queue infrastructure.

Current storage behavior:

- Backend-only local mode defaults to SQLite.
- Docker full-stack mode uses PostgreSQL.
- Document chunks are persisted as text chunks with embedding metadata in SQLite mode.
- PostgreSQL stores 384-dimensional embeddings in pgvector.
- Retrieval can run hybrid lexical + vector ranking.
- Redis stores ingestion queue messages, job status records, and retrieval cache entries.

## Future multi-agent extension

The current orchestration is intentionally linear. To evolve into multi-agent workflows, add a workflow layer above retrieval and LLM providers:

- planner agent for task decomposition
- retriever agent for source-specific lookup
- policy agent for access and compliance checks
- evaluator agent for groundedness review
- action agent for ticket creation or workflow updates

Keep shared services such as auth, retrieval, cost tracking, and logging outside agents so governance remains centralized.
