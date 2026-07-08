# Roadmap

## MVP

- Mock RBAC, five mock users, and basic document ingestion
- LangChain recursive chunking and persistent document/chunk storage
- LlamaIndex document normalization
- Synthetic content generation for document, PDF-like, data, JSON, and text demos
- Redis-backed ingestion jobs and worker process
- Mock embedding provider and optional Hugging Face embedding provider
- Redis-backed retrieval caching
- Permission-aware semantic answer cache
- Mock LLM provider with citations
- OpenAI-compatible mock provider and optional real OpenAI provider
- Model routing placeholder
- Persistent cost, latency, and token tracking
- Structured JSON logs
- Basic chat UI and admin pages for metrics, users, authentication, settings, and governance

## V1

- Database migrations and audit log persistence
- pgvector embeddings and hybrid retrieval
- Real file upload and parsers for PDF, Office, Markdown, and HTML
- OpenAI provider hardening and approved second-provider integration
- Celery workers for ingestion and embedding
- SSO integration and enterprise group sync
- Admin settings write workflows and audit events
- Feedback capture on answers

## Completed Phase 1 Foundation

- SQLAlchemy repository layer
- Mock authentication profile endpoint
- Admin users, authentication, settings, and governance APIs
- SQLite persistence for backend-only local development
- PostgreSQL-compatible persistence for full-stack Docker runs
- Persistent documents and chunks
- LangChain `RecursiveCharacterTextSplitter` chunking
- LlamaIndex `Document` normalization before chunking
- Synthetic document endpoint at `/synthetic/documents`
- Redis-backed ingestion job endpoints
- Worker service for async document and synthetic ingestion
- Mock/Hugging Face embedding generation attached to chunk metadata
- pgvector vector storage and basic vector search
- Hybrid lexical + vector retrieval
- OpenAI-compatible mock provider
- Optional real OpenAI Responses API provider with fallback
- Short-lived Redis retrieval cache
- Redis semantic answer cache for repeated/similar questions
- Persistent cost records and admin cost summaries
- Persistent evaluation records
- Automatic demo seed document
- One-command Windows runner in `run.ps1`
- `uv` backend package management
- `pnpm` frontend package management

## V2

- Confluence, SharePoint, Jira, and internal KB connectors
- Reranking and context compression
- Semantic answer cache hardening with analytics and admin controls
- Advanced prompt-injection and DLP controls
- Golden evaluation datasets and CI quality gates
- Department-level budgets, quotas, and rate limits
- Streaming responses and better citation UX

## Enterprise production

- Attribute-based access control with document-level ACL inheritance
- Source deletion propagation and legal hold support
- Multi-region deployment and disaster recovery
- Full OpenTelemetry traces, SIEM integration, and audit exports
- Human review workflows for low-confidence answers
- Adaptive model routing using quality, cost, latency, and risk telemetry
- Multi-agent workflows for complex research and operational actions
