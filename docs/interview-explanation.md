# Interview Explanation

## 2-minute HR or senior-manager explanation

This is a secure enterprise search assistant. Employees ask questions in plain English, and the system answers using approved internal knowledge such as policies, SOPs, Confluence pages, SharePoint files, Jira tickets, and PDFs.

The important enterprise features are built into the architecture. It checks who the user is, retrieves only documents that user is allowed to see, generates an answer with citations, and records cost, latency, token usage, and model choice. It also has guardrails for prompt-injection risk and hooks to evaluate answer quality.

The implementation is intentionally a skeleton. It uses mock users and mock LLM responses so the architecture is easy to understand, but documents, chunks, costs, and evaluations already persist through a repository layer. Ingestion now uses LangChain for recursive chunking, LlamaIndex for document normalization, Redis-backed jobs for async ingestion, and a mock embedding provider for demo vectors. Each module is shaped like a production component that can be extended with real connectors, pgvector search, enterprise identity, and commercial or local LLM providers.

## 10-minute technical explanation

The backend is a FastAPI service organized by architectural responsibility. The `/chat` endpoint orchestrates the main RAG flow: resolve user context, inspect the prompt, redact simple PII, choose a model route, retrieve authorized chunks, call an LLM provider, record cost telemetry, log a structured event, and return an answer with citations.

The ingestion module accepts documents, extracts metadata, converts payloads into LlamaIndex `Document` objects, chunks text with LangChain's recursive splitter, and can generate mock embeddings for each chunk. It supports both synchronous ingestion and Redis-backed async ingestion jobs processed by a worker. Today it stores parsed document and chunk records through SQLAlchemy and also has a synthetic content endpoint for document, PDF-like, data, JSON, and text demo material. Production would add object storage for raw files, migrations, PostgreSQL metadata, pgvector embedding search, and potentially Celery or a managed queue for heavier parsing, OCR, embedding, and permission-sync workloads.

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

I would scale ingestion as an asynchronous pipeline, not as a request/response API call. The API should accept the document or connector event, persist a job record, push work onto a queue, and return a job ID immediately. Workers then handle parsing, OCR, chunking, embedding, indexing, and permission synchronization independently.

In this project, the foundation is already shaped that way: Redis-backed ingestion jobs, a worker process, LangChain chunking, LlamaIndex document normalization, and mock embeddings. In production I would harden that with:

| Concern | Best Practice | Tools / Options |
| --- | --- | --- |
| Queueing | Use durable async jobs with retries and dead-letter handling | Celery + Redis/RabbitMQ, Dramatiq, RQ, AWS SQS, Google Pub/Sub, Azure Service Bus |
| Raw file storage | Store original files outside the API/database | S3, Azure Blob Storage, GCS, MinIO |
| Parsing | Use parser-specific workers and keep parser failures isolated | PyMuPDF, pdfplumber, Unstructured, Apache Tika, python-docx, BeautifulSoup |
| OCR | Route scanned documents to OCR workers only when needed | AWS Textract, Azure Document Intelligence, Google Document AI, Tesseract |
| Chunking | Use deterministic chunking and store chunk version/config | LangChain splitters, LlamaIndex nodes, custom semantic chunkers |
| Embeddings | Batch embedding requests and retry safely | OpenAI embeddings, Azure OpenAI, Cohere, Voyage, sentence-transformers |
| Indexing | Write metadata first, then chunks, then embeddings/index records | PostgreSQL, pgvector, OpenSearch/Elasticsearch |
| Idempotency | Use source document ID + version hash as the idempotency key | Source cursor tables, content hashes, unique DB constraints |
| Deletions | Tombstone deleted source documents and remove from retrieval | Soft-delete flags, source sync cursors, deletion propagation jobs |
| Observability | Track every job stage and failure reason | OpenTelemetry, Datadog, Prometheus/Grafana, ELK, Splunk |

The key production pattern is to isolate failure by document and by pipeline stage. One corrupt PDF should not block the whole connector sync. I would also make ingestion jobs resumable: if parsing succeeds but embedding fails, the retry should resume from embedding rather than reparsing the file.

For throughput, I would scale workers horizontally by workload type. Parsing and OCR workers are CPU or external-service heavy, embedding workers are rate-limit and batch-size sensitive, and indexing workers are database/write-throughput sensitive. Splitting those queues prevents one slow workload from starving the rest.

### How would you control LLM cost?

I would treat LLM cost as an engineering control plane, not just a billing report. The system should estimate cost before a call, record actual usage after the call, and use policy to choose the cheapest model that can satisfy the request.

In this project, the foundation already exists: model routing, cost records, token/latency telemetry, admin metrics, and Redis retrieval caching. In production I would expand it with:

| Control | Best Practice | Tools / Options |
| --- | --- | --- |
| Model routing | Route simple queries to cheaper models and complex/high-risk work to stronger models | Rules first, then telemetry-based routing |
| Token budgets | Set max input/output tokens per request, role, department, and task type | Provider parameters, policy tables, API middleware |
| Context compression | Reduce retrieved context before generation | Reranking, summarization, contextual compression, MMR |
| Retrieval quality | Retrieve fewer but better chunks to reduce prompt size | Hybrid search, rerankers, citation filters |
| Caching | Cache repeated retrieval and safe deterministic answers | Redis, semantic cache, prompt-response cache |
| Rate limits | Prevent runaway usage and abuse | Redis rate limiters, API gateway quotas, per-user limits |
| Budgets | Enforce monthly spend by user/team/department | Postgres usage tables, admin dashboards, alerting |
| Streaming cutoff | Stop generation early for long or low-value responses | Provider streaming APIs, max token caps |
| Evaluation loops | Detect expensive low-quality paths and improve routing | Golden datasets, feedback, LLM-as-judge, offline evals |
| Observability | Track spend by model, provider, route reason, tenant, and endpoint | OpenTelemetry, Datadog, Grafana, BigQuery/Snowflake |

The practical flow is: classify the question, estimate context size, choose a route, retrieve only authorized high-value chunks, compress/rerank if needed, enforce a token budget, call the model, then record actual cost. Over time, routing should become adaptive: if telemetry shows that a cheap model answers HR policy questions well, keep those on the cheap path; if legal or multi-step architecture questions fail quality checks, route them to a stronger model.

I would also put guardrails around expensive operations. For example, large summarization jobs should run asynchronously, require higher permissions, and show estimated cost before execution. Department-level quotas and alerts help finance and platform teams avoid surprise spend while still allowing high-value work to use better models when justified.
