# Roadmap

This roadmap reflects what is already completed in the repository and what should be implemented in later modules and phases.

## Phase 0: Reference Skeleton

Status: done.

Delivered:

- FastAPI backend skeleton.
- Next.js + Tailwind frontend skeleton.
- Docker Compose skeleton with PostgreSQL, pgvector, and Redis.
- Mock RBAC.
- Mock document ingestion.
- Text chunking.
- Permission-aware retrieval placeholder.
- Mock LLM provider.
- OpenAI provider placeholder.
- Rules-based model routing.
- Prompt-injection and PII placeholders.
- Cost, latency, token, provider, and model tracking.
- Structured JSON logging.
- Evaluation placeholder.
- Architecture, whiteboard, interview, tradeoff, and roadmap documentation.

Outcome:

The project demonstrates the end-to-end enterprise RAG shape without requiring external services or API keys.

## Phase 1: Persistent RAG Foundation

Goal: replace in-memory behavior with durable storage and real retrieval foundations.

Status: partially done.

Delivered:

- SQLAlchemy database setup.
- SQLite default for backend-only local development.
- PostgreSQL-compatible repository layer for Docker/full-stack runs.
- Persistent documents and chunks.
- Persistent cost records and admin cost summaries.
- Persistent evaluation records.
- Automatic demo seed document for easy local demos.
- One-command Windows runner in `run.ps1`.
- `uv` backend package management.
- `pnpm` frontend package management.

Planned modules:

- Database migration setup.
- pgvector embedding column usage.
- Embedding provider abstraction.
- Basic vector search.
- Metadata filtering by department and classification.

Deliverables:

- Documents survive backend restarts.
- `/documents` reads from PostgreSQL.
- `/chat` retrieves from stored chunks.
- Cost and evaluation history are queryable.

## Phase 2: Real Ingestion Pipeline

Goal: support enterprise document ingestion patterns.

Planned modules:

- File upload endpoint.
- Parser interface for text, PDF, Office, HTML, and Markdown.
- Source connector interface for Confluence, SharePoint, Jira, and internal KBs.
- Celery worker service.
- Redis-backed ingestion queue.
- Idempotent ingestion jobs.
- Document versioning.
- Deletion and tombstone handling.

Deliverables:

- Admins can upload files.
- Ingestion runs asynchronously.
- Failed documents can be retried.
- Source metadata is preserved.

## Phase 3: Production Retrieval Quality

Goal: improve answer quality and citation reliability.

Planned modules:

- Hybrid lexical plus semantic search.
- Reranking interface.
- Context assembly service.
- Context compression.
- Citation span tracking.
- Retrieval evaluation tests.
- No-result and low-confidence handling.

Deliverables:

- Better recall for semantic questions.
- Better precision for policy names, ticket IDs, acronyms, and exact phrases.
- More trustworthy citations.

## Phase 4: LLM Providers And Streaming

Goal: integrate real model providers while preserving vendor abstraction.

Planned modules:

- OpenAI provider implementation.
- Anthropic provider placeholder or implementation.
- Local model provider placeholder.
- Streaming chat responses.
- Retry and timeout policies.
- Structured response generation.
- Provider-level tracing metadata.

Deliverables:

- Real model-backed answers.
- Streamed frontend responses.
- Provider failover path.

## Phase 5: Enterprise Security And Governance

Goal: make security controls production-shaped.

Planned modules:

- SSO/JWT authentication.
- Group and department sync.
- Document ACL sync.
- Attribute-based access control.
- DLP integration placeholder.
- Secrets detection.
- Output policy checks.
- Audit log persistence.
- Prompt-injection classifier integration.

Deliverables:

- Real user identity.
- Document-level authorization.
- Auditable sensitive access.
- Stronger input and output guardrails.

## Phase 6: Observability, Evaluation, And Cost Controls

Goal: operate the assistant with measurable quality, reliability, and cost.

Planned modules:

- OpenTelemetry traces.
- Request, retrieval, LLM, and evaluation spans.
- Metrics dashboard data model.
- Golden evaluation datasets.
- LLM-as-judge evaluator.
- Groundedness and citation precision scoring.
- User feedback capture.
- Department budgets.
- Rate limits and quotas.

Deliverables:

- Quality regressions can be detected.
- Cost is visible by user, department, model, and provider.
- Production incidents are diagnosable.

## Phase 7: Admin And Knowledge Operations UI

Goal: give operators a usable enterprise control plane.

Planned modules:

- Document upload screen.
- Document browser.
- Connector status page.
- Ingestion job monitor.
- Cost dashboard.
- Evaluation dashboard.
- Feedback review queue.
- User and role demo switcher.

Deliverables:

- Admin users can manage knowledge ingestion.
- Operators can inspect costs, quality, and failures.

## Phase 8: Multi-Agent Workflows

Goal: extend beyond single-turn RAG once the governed foundation is stable.

Planned modules:

- Workflow orchestration layer.
- Planner agent.
- Retriever agent.
- Policy/compliance agent.
- Evaluator agent.
- Tool/action agent for enterprise workflow actions.
- Human approval steps for sensitive actions.

Deliverables:

- Multi-step research workflows.
- Governed tool use.
- Human-in-the-loop enterprise actions.

Important constraint:

Agents must reuse shared auth, retrieval, logging, cost, and evaluation services. They should not bypass the governed RAG path.

## Recommended Immediate Next Tasks

1. Add database migrations and repository interfaces.
2. Persist documents and chunks in PostgreSQL.
3. Add embedding abstraction and pgvector vector search.
4. Add a basic file upload endpoint and parser interface.
5. Add a worker service to Docker Compose.
6. Implement a real OpenAI provider behind the existing LLM interface.
7. Add trace IDs and persisted audit events.
