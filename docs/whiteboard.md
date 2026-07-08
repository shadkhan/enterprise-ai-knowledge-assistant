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

```mermaid
flowchart LR
    classDef actor fill:#ffffff,stroke:#1f2937,stroke-width:1px,color:#111827
    classDef ui fill:#eef2ff,stroke:#4f46e5,stroke-width:1px,color:#111827
    classDef admin fill:#ecfdf5,stroke:#059669,stroke-width:1px,color:#111827
    classDef note fill:#fff7ed,stroke:#f97316,stroke-width:1px,color:#111827

    subgraph People["Enterprise Users"]
        Employee(["Employee"])
        Manager(["Manager"])
        AdminUser(["Admin / Knowledge Owner"])
    end

    subgraph Frontend["Next.js Frontend"]
        ChatUI["Chat Assistant<br/>Ask questions<br/>View citations<br/>Submit feedback"]
        AdminUI["Admin Console<br/>Documents<br/>Ingestion<br/>Prompts<br/>Monitoring"]
    end

    subgraph Outcomes["User Outcomes"]
        Answer["Cited answer"]
        Preview["Source preview"]
        Ops["Knowledge operations"]
    end

    Employee --> ChatUI
    Manager --> ChatUI
    AdminUser --> ChatUI
    AdminUser --> AdminUI
    ChatUI --> Answer
    ChatUI --> Preview
    AdminUI --> Ops

    Employee:::actor
    Manager:::actor
    AdminUser:::actor
    ChatUI:::ui
    AdminUI:::admin
    Answer:::note
    Preview:::note
    Ops:::note
```

## 2. API layer

Draw FastAPI with endpoints:

- `/chat`
- `/ingest`
- `/documents`
- `/evaluate`
- `/metrics/cost`

Mention SSO/API gateway in production, even though this skeleton uses mock RBAC.

```mermaid
flowchart LR
    classDef edge fill:#f8fafc,stroke:#64748b,stroke-width:1px,color:#111827
    classDef api fill:#eef2ff,stroke:#4f46e5,stroke-width:1px,color:#111827
    classDef service fill:#ecfeff,stroke:#0891b2,stroke-width:1px,color:#111827
    classDef future fill:#faf5ff,stroke:#7c3aed,stroke-dasharray: 5 5,color:#111827

    Client["Next.js UI"]:::edge

    subgraph Gateway["Production Boundary"]
        WAF["WAF / API Gateway"]:::future
        SSO["OIDC / SAML SSO"]:::future
    end

    subgraph FastAPI["FastAPI API Layer"]
        Chat["POST /chat"]:::api
        Ingest["POST /ingest<br/>POST /ingest/jobs"]:::api
        Documents["GET /documents<br/>GET /admin/documents"]:::api
        Eval["POST /evaluate<br/>POST /admin/evaluations/run"]:::api
        Metrics["GET /metrics/cost<br/>GET /admin/monitoring"]:::api
        Admin["Users / Auth / Settings / Governance"]:::api
    end

    subgraph Services["Shared Services"]
        RBAC["Mock RBAC today<br/>SSO + ABAC later"]:::service
        Guardrails["Guardrails<br/>PII redaction"]:::service
        Repos["Repository layer"]:::service
        Logs["Structured logs"]:::service
    end

    Client --> WAF --> SSO --> FastAPI
    Client -. local demo .-> FastAPI
    FastAPI --> RBAC
    FastAPI --> Guardrails
    FastAPI --> Repos
    FastAPI --> Logs
```

## 3. Request path for chat

Draw:

User question -> auth context -> guardrails -> model router -> retrieval -> LLM provider -> evaluator/cost/logger -> response with citations.

Call out that document permissions are applied before chunks enter model context.

```mermaid
flowchart LR
    classDef step fill:#ffffff,stroke:#334155,stroke-width:1px,color:#111827
    classDef security fill:#fef2f2,stroke:#dc2626,stroke-width:1px,color:#111827
    classDef retrieval fill:#ecfeff,stroke:#0891b2,stroke-width:1px,color:#111827
    classDef llm fill:#f5f3ff,stroke:#7c3aed,stroke-width:1px,color:#111827
    classDef output fill:#ecfdf5,stroke:#059669,stroke-width:1px,color:#111827

    Q["User question"]:::step
    Auth["Resolve user context<br/>roles, department, clearance"]:::security
    Guard["Guardrails<br/>prompt injection checks<br/>PII redaction"]:::security
    Route["Model router<br/>cheap / premium / compatible"]:::llm
    Filter["Permission filter<br/>authorized documents only"]:::security
    Retrieve["Hybrid retrieval<br/>lexical + vector + optional rerank"]:::retrieval
    Prompt["Active prompt version<br/>authorized context only"]:::llm
    Generate["LLM provider<br/>mock / OpenAI / compatible"]:::llm
    Persist["Save conversation<br/>cost, citations, telemetry"]:::output
    Response["Answer with citations<br/>model + prompt metadata"]:::output

    Q --> Auth --> Guard --> Route --> Filter --> Retrieve --> Prompt --> Generate --> Persist --> Response
    Filter -. "No unauthorized chunk can enter context" .-> Prompt
```

## 4. Knowledge ingestion path

Draw:

Connectors -> queue -> parser/chunker -> metadata extractor -> embeddings -> PostgreSQL/pgvector.

Mention source systems: SharePoint, Confluence, Jira, PDFs, internal KBs.

Current implementation supports:

- Admin file upload for `.txt`, `.md`, `.csv`, and `.json`
- Folder batch ingestion from the configured watch folder
- Redis-backed async folder ingestion jobs
- Docker host folder `data/ingest` mounted to `/app/watch`

```mermaid
flowchart LR
    classDef source fill:#ffffff,stroke:#334155,stroke-width:1px,color:#111827
    classDef queue fill:#fff7ed,stroke:#f97316,stroke-width:1px,color:#111827
    classDef process fill:#eef2ff,stroke:#4f46e5,stroke-width:1px,color:#111827
    classDef store fill:#ecfdf5,stroke:#059669,stroke-width:1px,color:#111827
    classDef future fill:#faf5ff,stroke:#7c3aed,stroke-dasharray: 5 5,color:#111827

    subgraph Sources["Knowledge Sources"]
        Upload["Admin upload<br/>txt, md, csv, json"]:::source
        Folder["Folder watch<br/>data/ingest -> /app/watch"]:::source
        Synthetic["Synthetic demo documents"]:::source
        Connectors["SharePoint / Confluence / Jira / Drive"]:::future
        Files["PDF / DOCX / OCR"]:::future
    end

    subgraph Async["Async Work"]
        Jobs["Redis job record"]:::queue
        Queue["Redis ingestion queue"]:::queue
        Worker["Worker process"]:::process
    end

    subgraph Pipeline["Ingestion Pipeline"]
        Parse["Parse / normalize<br/>LlamaIndex Document"]:::process
        Metadata["Metadata extractor<br/>department, classification, tags"]:::process
        Chunk["Chunk text<br/>LangChain RecursiveCharacterTextSplitter"]:::process
        Embed["Embeddings<br/>mock or Hugging Face"]:::process
    end

    subgraph Persist["Persistence"]
        Docs[("documents")]:::store
        Chunks[("document_chunks")]:::store
        Vector[("pgvector embedding")]:::store
    end

    Upload --> Parse
    Synthetic --> Parse
    Folder --> Jobs --> Queue --> Worker --> Parse
    Connectors -. planned .-> Jobs
    Files -. planned .-> Parse
    Parse --> Metadata --> Chunk --> Embed
    Metadata --> Docs
    Chunk --> Chunks
    Embed --> Vector
```

## 5. Storage

Draw PostgreSQL for metadata, chunks, cost, evaluation, and audit records. Draw pgvector for embeddings and Redis for cache/queue/rate limits.

```mermaid
flowchart TB
    classDef app fill:#eef2ff,stroke:#4f46e5,stroke-width:1px,color:#111827
    classDef pg fill:#ecfdf5,stroke:#059669,stroke-width:1px,color:#111827
    classDef redis fill:#fef2f2,stroke:#dc2626,stroke-width:1px,color:#111827
    classDef future fill:#faf5ff,stroke:#7c3aed,stroke-dasharray: 5 5,color:#111827

    API["FastAPI services"]:::app
    Worker["Ingestion worker"]:::app

    subgraph Postgres["PostgreSQL"]
        Documents[("documents<br/>metadata + permissions")]:::pg
        Chunks[("document_chunks<br/>text + metadata")]:::pg
        Embeddings[("pgvector<br/>384-d vectors")]:::pg
        Conversations[("conversations<br/>messages + citations")]:::pg
        Costs[("cost records<br/>tokens + latency")]:::pg
        Evaluations[("evaluations<br/>scores + notes")]:::pg
        Feedback[("feedback")]:::pg
        Prompts[("prompt_templates")]:::pg
        Audit[("audit ledger")]:::future
    end

    subgraph Redis["Redis"]
        RetrievalCache[("retrieval cache")]:::redis
        SemanticCache[("semantic answer cache")]:::redis
        JobQueue[("ingestion queue")]:::redis
        JobStatus[("job status")]:::redis
        RateLimit[("rate limit / locks")]:::future
    end

    API --> Documents
    API --> Chunks
    API --> Embeddings
    API --> Conversations
    API --> Costs
    API --> Evaluations
    API --> Feedback
    API --> Prompts
    API --> RetrievalCache
    API --> SemanticCache
    Worker --> Documents
    Worker --> Chunks
    Worker --> Embeddings
    Worker --> JobQueue
    Worker --> JobStatus
    API -. production .-> Audit
    API -. production .-> RateLimit
```

## 6. Observability and governance

Draw logs, metrics, traces, audit logs, and evaluation datasets as cross-cutting concerns.

```mermaid
flowchart TB
    classDef runtime fill:#eef2ff,stroke:#4f46e5,stroke-width:1px,color:#111827
    classDef govern fill:#fff7ed,stroke:#f97316,stroke-width:1px,color:#111827
    classDef observe fill:#ecfdf5,stroke:#059669,stroke-width:1px,color:#111827
    classDef future fill:#faf5ff,stroke:#7c3aed,stroke-dasharray: 5 5,color:#111827

    subgraph Runtime["Runtime Path"]
        Chat["Chat orchestration"]:::runtime
        Retrieval["Permission-aware retrieval"]:::runtime
        LLM["LLM provider"]:::runtime
        Ingestion["Ingestion jobs"]:::runtime
    end

    subgraph Governance["Governance Controls"]
        RBAC["RBAC / future ABAC"]:::govern
        Guardrails["Prompt + PII guardrails"]:::govern
        Prompts["Prompt versions"]:::govern
        Policies["Governance policies"]:::govern
        Audit["Immutable audit log"]:::future
    end

    subgraph Observability["Observability"]
        Logs["JSON logs<br/>request + error events"]:::observe
        Metrics["Metrics<br/>latency, cost, cache hit"]:::observe
        Traces["Traces<br/>retrieval, rerank, LLM timing"]:::future
        EvalData["Golden datasets<br/>online evaluations"]:::observe
        Feedback["Human feedback"]:::observe
    end

    Governance -. controls .-> Runtime
    Runtime -. emits .-> Observability
    EvalData -. regression gates .-> Prompts
    Feedback -. tuning loop .-> Retrieval
    Metrics -. budget loop .-> LLM
```

## 7. Future agents

Draw a workflow/orchestration box above retrieval and LLM providers. Explain that agents reuse governed services rather than bypassing security controls.

```mermaid
flowchart TB
    classDef agent fill:#f5f3ff,stroke:#7c3aed,stroke-width:1px,color:#111827
    classDef service fill:#eef2ff,stroke:#4f46e5,stroke-width:1px,color:#111827
    classDef govern fill:#fff7ed,stroke:#f97316,stroke-width:1px,color:#111827
    classDef store fill:#ecfdf5,stroke:#059669,stroke-width:1px,color:#111827

    User["User request"]:::service

    subgraph Orchestration["Future Workflow / Agent Layer"]
        Planner["Planner agent<br/>decompose task"]:::agent
        RetrieverAgent["Retriever agent<br/>source-specific lookup"]:::agent
        PolicyAgent["Policy agent<br/>access + compliance review"]:::agent
        EvaluatorAgent["Evaluator agent<br/>groundedness review"]:::agent
        ActionAgent["Action agent<br/>ticket / workflow update"]:::agent
    end

    subgraph GovernedServices["Governed Shared Services"]
        Auth["Auth + RBAC / ABAC"]:::govern
        Guardrails["Guardrails + DLP"]:::govern
        Retrieval["Permission-aware retrieval"]:::service
        LLM["LLM provider abstraction"]:::service
        Cost["Cost + telemetry"]:::service
        Audit["Audit log"]:::store
    end

    User --> Planner
    Planner --> RetrieverAgent --> Retrieval
    Planner --> PolicyAgent --> Auth
    PolicyAgent --> Guardrails
    Planner --> LLM
    LLM --> EvaluatorAgent
    EvaluatorAgent --> Planner
    Planner --> ActionAgent
    Orchestration --> Cost
    Orchestration --> Audit

    Auth -. gates every step .-> Orchestration
    Guardrails -. validates input/output .-> Orchestration
```
