# Whiteboard Guide

Draw the system left to right.

## Product Architecture

```mermaid
flowchart LR
    Employee[Employee / Admin] --> UI[Next.js Chat + Admin Console]
    UI --> API[FastAPI API Layer]
    API --> Auth[Mock RBAC Today\nOIDC/SAML Later]
    API --> Guardrails[Guardrails + PII Redaction]
    API --> Chat[Chat Orchestrator]
    Chat --> History[Conversation History]
    Chat --> Router[Model Router]
    Chat --> Retrieval[Permission-aware Retrieval]
    Retrieval --> Cache[Redis Retrieval + Semantic Cache]
    Retrieval --> Store[(PostgreSQL + pgvector)]
    Router --> Mock[Mock / OpenAI Mock]
    Router --> OpenAI[OpenAI Responses API]
    Router --> Compatible[OpenAI-compatible Local/Free Models]
    Chat --> Cost[Cost + Telemetry]
    Chat --> Eval[Evaluation Hooks]
    API --> Admin[Governance, Prompts, Jobs, Metrics]
    API --> Uploads[File Upload + Folder Batch Ingestion]
```

## Chat Request Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Next.js UI
    participant API as FastAPI /chat
    participant RBAC as RBAC + Guardrails
    participant R as Retrieval
    participant LLM as LLM Provider
    participant DB as Postgres/Redis

    U->>UI: Ask question
    UI->>API: POST /chat with user + conversation id
    API->>RBAC: Resolve user, redact PII, enforce policy
    API->>R: Search authorized chunks only
    R->>DB: Hybrid lexical/vector retrieval
    DB-->>R: Ranked chunks
    API->>LLM: Prompt + authorized context
    LLM-->>API: Answer + token usage
    API->>DB: Save cost, citations, conversation messages
    API-->>UI: Answer, citations, provider, prompt version
    UI->>API: GET citation chunk preview
```

## Module Roadmap

```mermaid
flowchart TB
    subgraph Implemented
        A[RAG Chat]
        B[Prompt Governance]
        C[OpenAI / Mock / Compatible Providers]
        D[Async Ingestion Jobs]
        E[Conversation History]
        F[Citation Preview]
    end

    subgraph Next
        G[Expanded File Parsing: PDF/DOCX/OCR]
        H[Streaming Responses]
        I[Admin Runtime Controls]
        J[Evaluation Dashboard]
    end

    subgraph Enterprise
        K[SharePoint / Confluence / Drive Connectors]
        L[OIDC/SAML SSO]
        M[Audit Ledger]
        N[DLP + Policy Engine]
    end

    A --> G --> K
    B --> I
    C --> H
    E --> J
    F --> M
```

## 1. User and UI

Start with employees using a web chat UI. Show an admin page for usage metrics and knowledge operations.

## 2. API layer

Draw FastAPI with endpoints:

- `/chat`
- `/ingest`
- `/documents`
- `/evaluate`
- `/metrics/cost`

Mention SSO/API gateway in production, even though this skeleton uses mock RBAC.

## 3. Request path for chat

Draw:

User question -> auth context -> guardrails -> model router -> retrieval -> LLM provider -> evaluator/cost/logger -> response with citations.

Call out that document permissions are applied before chunks enter model context.

## 4. Knowledge ingestion path

Draw:

Connectors -> queue -> parser/chunker -> metadata extractor -> embeddings -> PostgreSQL/pgvector.

Mention source systems: SharePoint, Confluence, Jira, PDFs, internal KBs.

Current implementation supports:

- Admin file upload for `.txt`, `.md`, `.csv`, and `.json`
- Folder batch ingestion from the configured watch folder
- Redis-backed async folder ingestion jobs
- Docker host folder `data/ingest` mounted to `/app/watch`

## 5. Storage

Draw PostgreSQL for metadata, chunks, cost, evaluation, and audit records. Draw pgvector for embeddings and Redis for cache/queue/rate limits.

## 6. Observability and governance

Draw logs, metrics, traces, audit logs, and evaluation datasets as cross-cutting concerns.

## 7. Future agents

Draw a workflow/orchestration box above retrieval and LLM providers. Explain that agents reuse governed services rather than bypassing security controls.
