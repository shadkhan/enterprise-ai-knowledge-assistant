# Cloud Architecture Plan

## Purpose

This document defines the enterprise deployment plan for the Enterprise AI Knowledge Assistant across Google Cloud Platform and AWS. The goal is to keep one application architecture while providing two cloud-native deployment implementations:

- GCP deployment using Cloud Run, Cloud SQL, Memorystore, GCS, and Vertex AI / Gemini Enterprise Agent Platform.
- AWS deployment using ECS Fargate, RDS or Aurora PostgreSQL, ElastiCache, S3, and Amazon Bedrock.

The current application has these main components:

- Next.js frontend for landing, assistant, and admin pages.
- FastAPI backend for chat, retrieval, ingestion, admin APIs, evaluations, and governance.
- Worker process for async ingestion jobs.
- PostgreSQL with pgvector for durable records, chunks, and embeddings.
- Redis for queues, cache, jobs, and runtime state.
- LLM provider abstraction for mock, OpenAI-compatible, and future cloud AI providers.

The deployment strategy should preserve this separation of concerns. Cloud runtime services should run the app. AI platform services should provide models, agents, safety, evaluation, and governance.

## Architecture Principles

Both cloud deployments should follow the same enterprise standards:

| Principle | Implementation Direction |
| --- | --- |
| Environment isolation | Separate dev, stage, and prod environments. Use separate AWS accounts or GCP projects where possible. |
| Least privilege | Use workload identities, task roles, service accounts, and narrowly scoped IAM permissions. |
| Private data services | Keep PostgreSQL, Redis, and internal services private. Do not expose databases publicly. |
| Managed secrets | Store credentials in Secret Manager, AWS Secrets Manager, or SSM Parameter Store. Do not ship secrets in images or `.env` files. |
| Infrastructure as Code | Use Terraform for repeatable AWS and GCP environments. |
| Secure CI/CD | Use OIDC federation from CI to cloud providers instead of long-lived cloud keys. |
| Observability | Emit structured logs, metrics, traces, model cost, latency, token usage, evaluation results, and ingestion job state. |
| Resilience | Add health checks, readiness checks, backups, restore tests, retries, dead-letter handling, and rollback playbooks. |
| Cost governance | Track model spend, infrastructure spend, token budgets, cache hit rate, and per-team usage. |
| AI governance | Apply prompt versioning, groundedness evaluation, access-control checks, safety policies, and audit trails. |

This aligns with the Google Cloud Well-Architected Framework and the AWS Well-Architected Framework, especially operational excellence, security, reliability, performance efficiency, cost optimization, and sustainability.

References:

- Google Cloud Well-Architected Framework: https://docs.cloud.google.com/architecture/framework
- AWS Well-Architected Framework: https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html
- AWS Well-Architected pillars: https://docs.aws.amazon.com/wellarchitected/latest/framework/the-pillars-of-the-framework.html

## Recommended Runtime Strategy

Start with managed containers rather than Kubernetes.

For this project, Cloud Run on GCP and ECS Fargate on AWS provide the best balance of enterprise readiness, operational simplicity, scalability, and cost control. GKE or EKS can be introduced later if the organization requires Kubernetes platform standards, service mesh, custom scheduling, or shared platform-team operations.

| Layer | GCP Recommendation | AWS Recommendation |
| --- | --- | --- |
| Frontend | Cloud Run or Cloud CDN + Cloud Run | ECS Fargate behind ALB, optionally CloudFront |
| Backend API | Cloud Run | ECS Fargate |
| Worker | Cloud Run with always-allocated CPU or GKE Autopilot | ECS Fargate worker service |
| Database | Cloud SQL PostgreSQL with pgvector | RDS or Aurora PostgreSQL with pgvector |
| Cache / Queue | Memorystore Redis | ElastiCache Redis |
| File storage | GCS bucket | S3 bucket |
| Secrets | Secret Manager | Secrets Manager / SSM Parameter Store |
| Registry | Artifact Registry | ECR |
| Edge security | HTTPS Load Balancer + Cloud Armor | ALB + AWS WAF |
| Logs and metrics | Cloud Logging, Monitoring, Trace | CloudWatch, X-Ray, OpenTelemetry |
| IaC | Terraform | Terraform |

## GCP Reference Architecture

### Recommended GCP Services

| Capability | GCP Service |
| --- | --- |
| Frontend runtime | Cloud Run |
| Backend API runtime | Cloud Run |
| Worker runtime | Cloud Run with always-allocated CPU, or GKE Autopilot for heavier workers |
| PostgreSQL | Cloud SQL for PostgreSQL |
| Vector search | pgvector in Cloud SQL, with future option for Vertex AI Vector Search if needed |
| Redis | Memorystore for Redis |
| Raw documents | Google Cloud Storage |
| AI models | Vertex AI / Gemini Enterprise Agent Platform |
| Agent framework | Agent Development Kit when workflows become agentic |
| Container registry | Artifact Registry |
| Secrets | Secret Manager |
| Network security | VPC, private service access, Cloud Armor, HTTPS Load Balancer |
| Observability | Cloud Logging, Cloud Monitoring, Cloud Trace, Error Reporting |
| CI/CD | GitHub Actions with Workload Identity Federation, Cloud Build, or Cloud Deploy |

### GCP Request Flow

```text
User Browser
  -> HTTPS Load Balancer / Cloud Run URL
  -> Frontend Cloud Run service
  -> Backend Cloud Run service
  -> Cloud SQL PostgreSQL / Memorystore Redis / GCS / Vertex AI
```

The frontend uses a public API URL:

```text
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

The backend should call Google Cloud services using its Cloud Run service account. It should not use static service account keys in production.

```text
Backend Cloud Run
  -> Vertex AI / Gemini
  -> Cloud SQL PostgreSQL with pgvector
  -> Memorystore Redis
  -> GCS document bucket
```

### GCP Worker Pattern

The current app has a long-running worker process. On GCP there are two good options:

| Option | When To Use |
| --- | --- |
| Cloud Run worker with always-allocated CPU | Good for a simple worker that consumes Redis jobs and does moderate background processing. |
| GKE Autopilot worker | Better for heavier ingestion, long-running jobs, OCR, large embedding batches, or multiple worker pools. |

Cloud Run is request and event friendly, but background workers need careful configuration. Always-allocated CPU can support background work while the instance is running. If ingestion grows into a serious pipeline, GKE Autopilot or Pub/Sub-based workers become cleaner.

References:

- Cloud Run docs: https://docs.cloud.google.com/run/docs
- Cloud Run CPU configuration: https://docs.cloud.google.com/run/docs/configuring/services/cpu
- Cloud SQL pgvector guide: https://docs.cloud.google.com/sql/docs/postgres/generate-manage-vector-embeddings

## AWS Reference Architecture

### Recommended AWS Services

| Capability | AWS Service |
| --- | --- |
| Frontend runtime | ECS Fargate behind Application Load Balancer |
| Backend API runtime | ECS Fargate |
| Worker runtime | ECS Fargate service |
| PostgreSQL | Amazon RDS PostgreSQL or Aurora PostgreSQL |
| Vector search | pgvector in RDS/Aurora PostgreSQL, with future option for OpenSearch or specialized vector DB |
| Redis | ElastiCache for Redis |
| Raw documents | S3 |
| AI models | Amazon Bedrock |
| Custom ML/model hosting | SageMaker AI when required |
| Container registry | ECR |
| Secrets | AWS Secrets Manager or SSM Parameter Store |
| Network security | VPC, private subnets, NAT, ALB, AWS WAF, Security Groups |
| Observability | CloudWatch, X-Ray, OpenTelemetry |
| CI/CD | GitHub Actions with OIDC, CodePipeline, or CodeBuild |

### AWS Request Flow

```text
User Browser
  -> Route 53
  -> CloudFront optional
  -> ALB + AWS WAF
  -> Frontend ECS Fargate service
  -> Backend ECS Fargate service
  -> RDS / ElastiCache / S3 / Bedrock
```

The frontend uses:

```text
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

The backend should call AWS services through the ECS task role. It should not store static AWS access keys in environment variables.

```text
Backend ECS Task
  -> Amazon Bedrock
  -> RDS PostgreSQL with pgvector
  -> ElastiCache Redis
  -> S3 document bucket
```

### AWS Runtime Choice

ECS Fargate is the recommended primary runtime for this application because it can run the frontend, backend, and worker as normal containers without managing EC2 hosts.

Lambda can still be useful, but mostly as event glue:

| Use Lambda For | Avoid Lambda For |
| --- | --- |
| S3 upload triggers | Full Next.js app hosting |
| Lightweight APIs | Long-running ingestion workers |
| Scheduled cleanup jobs | Heavy embedding/reranking workloads |
| Webhooks | Streaming chat as the main path |
| Async fan-out tasks | Large dependency containers unless carefully optimized |

Recommended AWS split:

```text
ECS Fargate = main frontend, backend, and worker runtime
Lambda = event triggers, scheduled tasks, and lightweight automation
```

References:

- ECS best practices: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-best-practices.html
- AWS Fargate for ECS: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html
- ECS task IAM roles: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html
- ECS secrets guidance: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data.html

## AI Platform Decision

The cloud runtime and AI platform are separate decisions.

Cloud Run, ECS Fargate, and Lambda answer: "Where does my application code run?"

Vertex AI, ADK, Bedrock, and SageMaker answer: "How do I access, govern, evaluate, train, or orchestrate AI models?"

## When To Use Vertex AI / Gemini Enterprise Agent Platform / ADK

Use Vertex AI or Gemini Enterprise Agent Platform when the GCP deployment needs enterprise AI capabilities:

- Managed Gemini model access through Google Cloud.
- Enterprise IAM, logging, monitoring, and governance around AI usage.
- Agent tooling, evaluation, tracing, safety, and deployment workflows.
- Integration with Cloud Run, Cloud SQL, GCS, BigQuery, Cloud Logging, and Cloud Monitoring.
- Code-first agent development using Agent Development Kit.

ADK is useful when the assistant evolves from a RAG chatbot into an agentic system.

Use ADK when the assistant needs to:

- Search documents.
- Call internal tools and APIs.
- Create structured summaries.
- Trigger business workflows.
- Use multiple specialized agents.
- Evaluate or inspect its own intermediate steps.
- Maintain governed tool execution.

For the current app, ADK is optional at the beginning. If the first production version is chat, retrieval, citations, feedback, evaluations, and admin governance, the backend can call Gemini or Vertex AI directly through a provider adapter.

Add ADK when the product becomes more workflow-oriented.

Reference:

- Agent Development Kit docs: https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/adk
- ADK site: https://adk.dev/

## When To Use Amazon Bedrock

Use Amazon Bedrock when the AWS deployment needs managed foundation model access without operating model infrastructure.

Bedrock is the right default for AWS GenAI when:

- The enterprise wants AWS-native AI governance and IAM integration.
- The app needs access to multiple foundation model providers through one service.
- The team wants managed inference rather than self-hosted model servers.
- The app may use Bedrock Agents, Knowledge Bases, Guardrails, evaluations, or model routing later.
- The team wants to avoid custom ML operations for the first production release.

For this app, Bedrock is the AWS equivalent of the managed GenAI layer. The FastAPI backend should call Bedrock through a provider adapter, using the ECS task role for authorization.

References:

- Amazon Bedrock docs: https://docs.aws.amazon.com/bedrock/
- Bedrock overview: https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html
- Bedrock supported models: https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html

## When To Use SageMaker

Use SageMaker when the team needs ML engineering capabilities, not just foundation model API access.

SageMaker is appropriate when:

- The team needs to train or fine-tune custom ML models.
- The team needs custom inference endpoints.
- The team needs managed notebooks, experiments, pipelines, model registry, or MLOps.
- The team wants to host a private embedding model, reranker, classifier, or domain model.
- The system requires GPU-backed model hosting with custom containers.

For this app, SageMaker should not be the first choice unless there is a known requirement for custom model training or private model hosting. Bedrock is simpler for managed GenAI inference.

Reference:

- SageMaker AI docs: https://docs.aws.amazon.com/sagemaker/latest/dg/whatis.html

## AI Platform Recommendation

For GCP:

```text
Frontend -> Cloud Run
Backend API -> Cloud Run
Worker -> Cloud Run or GKE Autopilot
AI Layer -> Gemini / Vertex AI
Agent Framework -> ADK when workflows become agentic
```

For AWS:

```text
Frontend -> ECS Fargate
Backend API -> ECS Fargate
Worker -> ECS Fargate
AI Layer -> Amazon Bedrock
SageMaker -> only for custom ML/model training/model hosting
```

## Production Readiness Work For This Repository

Before deploying to either cloud, implement these repo-level changes:

| Area | Needed Change | Reason |
| --- | --- | --- |
| Frontend container | Add production `frontend/Dockerfile` | Current local Compose uses `pnpm dev`, which is not production deployment. |
| Backend health | Add `/health` and `/ready` checks | Load balancers and container platforms need reliable liveness/readiness signals. |
| Migrations | Add Alembic or equivalent migration workflow | Production schema should not depend on local init SQL. |
| Object storage | Replace local ingestion folder with S3/GCS upload flow | Local mounted folders do not work well in cloud-native deployment. |
| Config | Create an environment variable matrix | Dev, stage, and prod need predictable configuration. |
| Secrets | Remove production dependency on `.env` files | Secrets should come from managed secret stores. |
| Logging | Ensure structured JSON logs with request IDs | Needed for cloud observability and incident debugging. |
| Tracing | Add OpenTelemetry instrumentation | Required for latency analysis across frontend, backend, DB, Redis, and AI providers. |
| CI checks | Build, test, scan, and produce SBOM | Enterprise pipelines need repeatable quality and security checks. |
| Evaluation | Run golden evaluations in CI and admin workflows | Prevent retrieval, citation, or access-control regressions. |
| Cost telemetry | Persist usage by model, user, department, and request type | Needed for AI cost governance. |

## Infrastructure As Code Structure

Recommended deployment folder:

```text
deploy/
  terraform/
    modules/
      container-service/
      postgres/
      redis/
      object-storage/
      observability/
      secrets/
      networking/
    gcp/
      dev/
      stage/
      prod/
    aws/
      dev/
      stage/
      prod/
  pipelines/
    github-actions/
      build-test-scan.yml
      deploy-gcp.yml
      deploy-aws.yml
  runbooks/
    deployment.md
    rollback.md
    restore-database.md
    incident-response.md
```

## CI/CD Plan

The CI/CD pipeline should be cloud-neutral at the beginning:

1. Install dependencies.
2. Run backend tests.
3. Run frontend typecheck and build.
4. Build backend, frontend, and worker images.
5. Scan images for vulnerabilities.
6. Generate SBOM.
7. Push images to Artifact Registry or ECR.
8. Run Terraform plan.
9. Require approval for stage/prod.
10. Apply Terraform.
11. Deploy service revision or ECS task definition.
12. Run smoke tests.
13. Run golden evaluations.
14. Publish deployment summary.

Use OIDC federation from GitHub Actions or the chosen CI system. Do not store long-lived cloud credentials in CI.

## Security Plan

| Layer | Security Control |
| --- | --- |
| Edge | TLS, WAF, rate limits, bot protection where required |
| Runtime | Non-root containers where practical, minimal images, read-only filesystem where possible |
| Identity | Cloud Run service accounts or ECS task roles with least privilege |
| Network | Private DB/Redis, private subnets, restricted egress, VPC connectors or VPC networking |
| Secrets | Managed secret stores, rotation policy, no secrets in images |
| Data | Encryption at rest and in transit, KMS/CMEK where required |
| AI | Prompt-injection checks, DLP/redaction, source trust ranking, output policy checks |
| Audit | Admin action logs, chat metadata logs, document access logs |
| Supply chain | Image scanning, dependency scanning, SBOM, signed images if required |

## Observability Plan

Track application and AI behavior together.

| Signal | Examples |
| --- | --- |
| API metrics | Request count, latency, errors, timeout rate |
| Retrieval metrics | Retrieved chunk count, authorized chunk count, citation count, cache hits |
| LLM metrics | Provider, model, input tokens, output tokens, latency, cost |
| Ingestion metrics | Job count, stage duration, parse failures, embedding failures |
| Evaluation metrics | Golden pass rate, groundedness, citation precision, leakage checks |
| Infra metrics | CPU, memory, DB connections, Redis memory, queue depth |
| Business metrics | Active users, department usage, top question categories, feedback quality |

Recommended SLOs:

- API availability.
- Chat response latency.
- Ingestion completion latency.
- Evaluation pass rate.
- Authorization leakage rate should be zero.
- Error budget for provider failures and timeouts.

## Data And Ingestion Plan

Local ingestion currently uses a mounted folder. In cloud deployment, raw files should go to object storage:

```text
Admin Upload / Connector
  -> S3 or GCS raw bucket
  -> Ingestion job event
  -> Worker parses document
  -> Worker chunks document
  -> Worker generates embeddings
  -> Worker writes documents, chunks, vectors, and metadata
  -> Retrieval can use authorized chunks
```

On GCP, the event system can evolve toward GCS events, Eventarc, Pub/Sub, and Cloud Run jobs.

On AWS, the event system can evolve toward S3 events, EventBridge, SQS, Lambda triggers, and ECS workers.

The production principle is that ingestion should be asynchronous, resumable, observable, and isolated by document and stage.

## Deployment Phases

### Phase 1: App Production Hardening

- Add production frontend Dockerfile.
- Add backend health/readiness checks.
- Add migration workflow.
- Add object storage abstraction.
- Add structured logging and trace IDs.
- Create deployment configuration matrix.

### Phase 2: GCP Dev Environment

- Create Terraform foundation.
- Deploy Artifact Registry, Cloud SQL, Memorystore, GCS, Secret Manager.
- Deploy frontend/backend/worker to Cloud Run.
- Connect backend to Vertex AI / Gemini through provider adapter.
- Add smoke tests and golden evaluations.

### Phase 3: AWS Dev Environment

- Create Terraform foundation.
- Deploy ECR, RDS/Aurora, ElastiCache, S3, Secrets Manager.
- Deploy frontend/backend/worker to ECS Fargate.
- Connect backend to Bedrock through provider adapter.
- Add smoke tests and golden evaluations.

### Phase 4: Security And Governance

- Add WAF and rate limits.
- Add private networking.
- Add least-privilege IAM.
- Add audit logs.
- Add secret rotation policy.
- Add vulnerability scanning and SBOM.
- Add cost and usage dashboards.

### Phase 5: Stage And Prod

- Promote Terraform modules across environments.
- Add deployment approvals.
- Add backup and restore tests.
- Add canary or blue/green deployment.
- Add rollback runbooks.
- Add incident response runbooks.

### Phase 6: Scale And Platform Evolution

- Consider GKE/EKS only if enterprise platform requirements justify it.
- Split ingestion workers by workload type.
- Add Pub/Sub or SQS if Redis queue becomes insufficient.
- Add dedicated vector search if pgvector no longer meets scale or latency needs.
- Add ADK or Bedrock Agents if workflows become truly agentic.
- Add SageMaker only for custom ML training or model hosting.

## Final Recommendation

Use this as the default enterprise path:

```text
GCP:
Cloud Run + Cloud SQL PostgreSQL/pgvector + Memorystore Redis + GCS + Vertex AI/Gemini.
Add ADK later when the assistant becomes a workflow agent.

AWS:
ECS Fargate + RDS/Aurora PostgreSQL/pgvector + ElastiCache Redis + S3 + Amazon Bedrock.
Use SageMaker only when custom ML training or model hosting is required.
```

This gives the project a production-ready architecture without over-engineering the first deployment. It keeps the app portable, cloud-native, observable, secure, and ready for deeper agent workflows later.
