# Interview Explanation

## 2-minute HR or senior-manager explanation

This is a secure enterprise search assistant. Employees ask questions in plain English, and the system answers using approved internal knowledge such as policies, SOPs, Confluence pages, SharePoint files, Jira tickets, and PDFs.

The important enterprise features are built into the architecture. It checks who the user is, retrieves only documents that user is allowed to see, generates an answer with citations, and records cost, latency, token usage, and model choice. It also has guardrails for prompt-injection risk and hooks to evaluate answer quality.

The implementation is intentionally a skeleton. It uses mock users and mock LLM responses so the architecture is easy to understand, but documents, chunks, costs, and evaluations already persist through a repository layer. Each module is shaped like a production component that can be extended with real connectors, pgvector search, enterprise identity, and commercial or local LLM providers.

## 10-minute technical explanation

The backend is a FastAPI service organized by architectural responsibility. The `/chat` endpoint orchestrates the main RAG flow: resolve user context, inspect the prompt, redact simple PII, choose a model route, retrieve authorized chunks, call an LLM provider, record cost telemetry, log a structured event, and return an answer with citations.

The ingestion module accepts documents, extracts metadata, and chunks text. Today it stores parsed document and chunk records through SQLAlchemy; production would add object storage for raw files, migrations, PostgreSQL metadata, and pgvector embeddings. Ingestion should run asynchronously through Celery or another queue because parsing, OCR, embedding, and permission sync are slow and failure-prone.

Retrieval is security-sensitive. The skeleton filters documents by user role, department, and clearance before ranking. In production I would enforce authorization both at metadata query time and again before context assembly. The retrieval strategy should be hybrid: lexical search for exact identifiers and policy names, vector search for semantic recall, metadata filters for ACL/classification/freshness, and reranking for precision.

The LLM layer is provider-agnostic. The code defines an interface and currently ships with a mock provider plus an OpenAI placeholder. That separation allows routing across OpenAI, Anthropic, Azure-hosted models, or local models without rewriting the orchestration layer.

Model routing starts rules-based. Short, simple questions go to a cheap fast model; complex or high-quality requests go to a premium model. Over time, routing can become adaptive using telemetry: answer quality, user feedback, latency SLOs, query category, context size, and budget.

Security includes prompt-injection checks and PII redaction placeholders. A production system would add DLP integration, source trust ranking, output policy checks, secrets detection, and full audit logging.

Evaluation is intentionally pluggable. The current hook performs simple citation checks. A real system would run golden datasets, LLM-as-judge scoring, groundedness checks, citation precision, and regression tests in CI and production monitoring.

Observability and cost tracking are first-class. Every chat response returns model, provider, latency, tokens, and estimated cost. Logs are structured JSON so they can be shipped to Splunk, Datadog, ELK, or OpenTelemetry.

The architecture is also ready for multi-agent workflows because core capabilities are modular: auth, retrieval, LLM providers, evaluation, cost, and logging are separate services. Agents can be added as orchestration layers without bypassing governance.

## Common interviewer follow-up questions

### How do you prevent unauthorized data leakage?

Filter documents using the user's identity, department, groups, clearance, and document ACLs before retrieval results are placed into the model context. Recheck authorization before citation rendering. Keep audit logs for sensitive access.

### Why not fine-tune the model on enterprise documents?

Fine-tuning is not ideal for frequently changing factual knowledge or access-controlled content. RAG keeps knowledge external, current, and permission-aware.

### How do you handle stale documents?

Track source version, updated timestamp, deletion status, and connector sync cursor. Re-embed changed chunks and tombstone deleted documents so retrieval cannot surface stale content.

### How do you measure answer quality?

Use offline golden datasets, groundedness checks, citation precision, answer completeness, human feedback, and production monitoring by question category.

### What happens if retrieval finds nothing?

The assistant should say it cannot find authorized sources, ask a clarifying question, or route to a knowledge owner. It should not invent an answer.

### How would you scale ingestion?

Use queue workers for parsing, OCR, chunking, embedding, and indexing. Make jobs idempotent, persist source cursors, and isolate failures by document.

### How would you control LLM cost?

Use model routing, context compression, caching, token budgets, rate limits, usage dashboards, and department-level quotas.
