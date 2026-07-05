# Roadmap

## MVP

- Mock RBAC and basic document ingestion
- Text chunking and in-memory retrieval
- Mock LLM provider with citations
- Model routing placeholder
- Cost, latency, and token tracking
- Structured JSON logs
- Basic chat UI and admin metrics placeholder

## V1

- PostgreSQL persistence for documents, chunks, costs, evaluations, and audit logs
- pgvector embeddings and hybrid retrieval
- Real file upload and parsers for PDF, Office, Markdown, and HTML
- OpenAI or approved provider integration
- Celery workers for ingestion and embedding
- SSO integration and enterprise group sync
- Feedback capture on answers

## V2

- Confluence, SharePoint, Jira, and internal KB connectors
- Reranking and context compression
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

