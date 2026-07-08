# Deployment Compatibility Strategy

## Goal

The app should run in three modes without changing application code:

- Local development.
- GCP deployment.
- AWS deployment.

The strategy is to keep the core app cloud-neutral and select infrastructure behavior through environment configuration and provider adapters.

This avoids hardcoding cloud-specific logic across the application.

## Recommended Approach

Use a three-layer configuration model:

```text
Application code
  -> Provider interfaces and adapters
  -> Environment-specific configuration
```

The app should not ask "am I on AWS or GCP?" in many places. Instead, it should ask:

- Which database URL should I use?
- Which Redis URL should I use?
- Which object storage provider should I use?
- Which LLM provider should I use?
- Which embedding provider should I use?
- Which auth provider should I use?
- Which observability exporter should I use?

Then `.env`, cloud secrets, or deployment manifests decide the answer.

## Current State

The app already has a good foundation:

- Backend uses Pydantic settings in `backend/app/core/config.py`.
- Backend already reads `.env`.
- Frontend already uses `NEXT_PUBLIC_API_BASE_URL`.
- LLM provider is already abstracted with `mock`, `openai`, `openai_mock`, and `openai_compatible`.
- Embedding provider is already abstracted with `mock` and `huggingface`.
- Local Compose already wires PostgreSQL, Redis, backend, worker, and frontend together.

This means cloud compatibility does not require rewriting the app. It requires adding a small number of provider adapters and deployment profiles.

## Configuration Strategy

Use these high-level settings:

| Setting | Purpose | Example Values |
| --- | --- | --- |
| `ENVIRONMENT` | Runtime environment | `local`, `dev`, `stage`, `prod` |
| `DEPLOYMENT_TARGET` | Where the app is running | `local`, `gcp`, `aws` |
| `DATABASE_URL` | PostgreSQL connection string | Local Postgres, Cloud SQL, RDS |
| `REDIS_URL` | Redis connection string | Local Redis, Memorystore, ElastiCache |
| `OBJECT_STORAGE_PROVIDER` | Raw document storage | `local`, `gcs`, `s3` |
| `OBJECT_STORAGE_BUCKET` | Cloud bucket name | `eaka-dev-documents` |
| `DEFAULT_LLM_PROVIDER` | Chat model provider | `mock`, `openai`, `vertex`, `bedrock`, `openai_compatible` |
| `DEFAULT_EMBEDDING_PROVIDER` | Embedding provider | `mock`, `huggingface`, `vertex`, `bedrock`, `openai` |
| `AUTH_PROVIDER` | Identity provider | `mock`, `oidc`, `saml`, `cognito`, `iap` |
| `OBSERVABILITY_PROVIDER` | Logs/traces export | `local`, `gcp`, `aws`, `otel` |
| `SECRETS_PROVIDER` | Secret source | `env`, `gcp_secret_manager`, `aws_secrets_manager` |

The app should keep using normal environment variables at runtime. The deployment platform decides how those variables are injected:

| Runtime | How Settings Are Injected |
| --- | --- |
| Local | `.env`, Docker Compose, or shell environment |
| GCP Cloud Run | Cloud Run env vars + Secret Manager references |
| AWS ECS Fargate | ECS task definition env vars + Secrets Manager / SSM references |

## Environment Files

Keep examples in source control, but never commit real secrets.

Recommended files:

```text
backend/
  .env.example
  .env.local.example
  .env.gcp.example
  .env.aws.example

frontend/
  .env.example
  .env.local.example
  .env.gcp.example
  .env.aws.example
```

Actual `.env` files should remain local-only and ignored by git.

## Example Local Backend Profile

```env
ENVIRONMENT=local
DEPLOYMENT_TARGET=local

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/knowledge
REDIS_URL=redis://localhost:6379/0

OBJECT_STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./data/ingest

DEFAULT_LLM_PROVIDER=mock
DEFAULT_EMBEDDING_PROVIDER=mock
AUTH_PROVIDER=mock
OBSERVABILITY_PROVIDER=local
SECRETS_PROVIDER=env
```

## Example GCP Backend Profile

```env
ENVIRONMENT=prod
DEPLOYMENT_TARGET=gcp

DATABASE_URL=postgresql://app_user:${DB_PASSWORD}@/knowledge?host=/cloudsql/project:region:instance
REDIS_URL=redis://10.0.0.10:6379/0

OBJECT_STORAGE_PROVIDER=gcs
OBJECT_STORAGE_BUCKET=eaka-prod-documents

DEFAULT_LLM_PROVIDER=vertex
DEFAULT_EMBEDDING_PROVIDER=vertex
AUTH_PROVIDER=oidc
OBSERVABILITY_PROVIDER=gcp
SECRETS_PROVIDER=gcp_secret_manager

VERTEX_LOCATION=us-central1
VERTEX_CHEAP_MODEL=gemini-1.5-flash
VERTEX_PREMIUM_MODEL=gemini-1.5-pro
```

In production, `DB_PASSWORD` and any sensitive values should come from Secret Manager, not a literal `.env` file.

## Example AWS Backend Profile

```env
ENVIRONMENT=prod
DEPLOYMENT_TARGET=aws

DATABASE_URL=postgresql://app_user:${DB_PASSWORD}@eaka-prod.cluster-xxxx.us-east-1.rds.amazonaws.com:5432/knowledge
REDIS_URL=redis://eaka-prod.xxxxxx.use1.cache.amazonaws.com:6379/0

OBJECT_STORAGE_PROVIDER=s3
OBJECT_STORAGE_BUCKET=eaka-prod-documents

DEFAULT_LLM_PROVIDER=bedrock
DEFAULT_EMBEDDING_PROVIDER=bedrock
AUTH_PROVIDER=oidc
OBSERVABILITY_PROVIDER=aws
SECRETS_PROVIDER=aws_secrets_manager

AWS_REGION=us-east-1
BEDROCK_CHEAP_MODEL=amazon.nova-lite-v1:0
BEDROCK_PREMIUM_MODEL=anthropic.claude-3-5-sonnet-20240620-v1:0
```

In production, `DB_PASSWORD` and provider secrets should come from AWS Secrets Manager or SSM Parameter Store.

## Example Frontend Profiles

Local:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

GCP:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.gcp.example.com
```

AWS:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.aws.example.com
```

The frontend should stay simple. It should not know whether the backend is on AWS or GCP. It only needs the API base URL and public feature flags.

## Provider Adapter Pattern

Use interfaces for cloud-specific services:

```text
StorageProvider
  - LocalStorageProvider
  - GCSStorageProvider
  - S3StorageProvider

LLMProvider
  - MockLLMProvider
  - OpenAIProvider
  - VertexAIProvider
  - BedrockProvider
  - OpenAICompatibleProvider

EmbeddingProvider
  - MockEmbeddingProvider
  - HuggingFaceEmbeddingProvider
  - VertexEmbeddingProvider
  - BedrockEmbeddingProvider

SecretsProvider
  - EnvSecretsProvider
  - GCPSecretManagerProvider
  - AWSSecretsManagerProvider

ObservabilityProvider
  - LocalLoggingProvider
  - GCPObservabilityProvider
  - AWSObservabilityProvider
  - OpenTelemetryProvider
```

The factory pattern should be the only place that switches on provider names.

Good:

```text
get_storage_provider(settings.object_storage_provider)
get_llm_provider(settings.default_llm_provider)
```

Avoid:

```text
if settings.deployment_target == "aws":
    ...
elif settings.deployment_target == "gcp":
    ...
```

Use `DEPLOYMENT_TARGET` mainly for deployment metadata, diagnostics, and safe defaults. Use provider-specific settings for actual behavior.

## What Should Stay Cloud-Neutral

These modules should not contain AWS/GCP-specific code:

- Chat orchestration.
- Retrieval logic.
- Prompt governance.
- Evaluation runner.
- Admin route behavior.
- RBAC policy model.
- Cost tracking model.
- Conversation repository.
- Document/chunk schema.

These modules can call interfaces, but they should not import cloud SDKs directly.

## What Can Be Cloud-Specific

Cloud-specific code should live in adapter modules:

```text
backend/app/storage/
  base.py
  local_provider.py
  gcs_provider.py
  s3_provider.py
  factory.py

backend/app/llm/
  vertex_provider.py
  bedrock_provider.py

backend/app/embeddings/
  vertex_provider.py
  bedrock_provider.py

backend/app/secrets/
  env_provider.py
  gcp_secret_manager_provider.py
  aws_secrets_manager_provider.py
```

This keeps cloud dependencies optional and contained.

## Optional Dependency Strategy

Cloud SDKs should be optional dependency groups, not mandatory for local development.

Recommended backend dependency groups:

```text
base:
  FastAPI, SQLAlchemy, Pydantic, Redis client

llm:
  OpenAI client or generic provider clients

gcp:
  google-cloud-storage
  google-cloud-secret-manager
  google-cloud-aiplatform
  google-cloud-logging

aws:
  boto3
  botocore
  aws-opentelemetry-distro if used

embeddings:
  sentence-transformers
```

Build images by target:

```text
Local/dev:
  uv sync --frozen --no-dev

GCP:
  uv sync --frozen --no-dev --group gcp --group llm

AWS:
  uv sync --frozen --no-dev --group aws --group llm
```

If maintaining separate images is too much, use one production image with both AWS and GCP optional packages. That is simpler but larger.

## Deployment Profile Matrix

| Concern | Local | GCP | AWS |
| --- | --- | --- | --- |
| Frontend runtime | Next dev or container | Cloud Run | ECS Fargate or static hosting + CloudFront |
| Backend runtime | Docker Compose | Cloud Run | ECS Fargate |
| Worker runtime | Docker Compose worker | Cloud Run worker/job or GKE Autopilot | ECS Fargate worker/scheduled task |
| Database | Local Postgres or SQLite | Cloud SQL PostgreSQL | RDS/Aurora PostgreSQL |
| Vector store | pgvector/local fallback | Cloud SQL pgvector | RDS/Aurora pgvector |
| Redis | Local Redis | Memorystore | ElastiCache |
| Documents | Local folder | GCS | S3 |
| AI | Mock/OpenAI-compatible | Vertex AI/Gemini | Bedrock |
| Secrets | `.env` | Secret Manager | Secrets Manager/SSM |
| Observability | Console logs | Cloud Logging/Monitoring | CloudWatch/X-Ray |

## Implementation Plan

### Phase 1: Configuration Hardening

- Add `DEPLOYMENT_TARGET`.
- Add `OBJECT_STORAGE_PROVIDER`.
- Add `OBJECT_STORAGE_BUCKET`.
- Add `AUTH_PROVIDER`.
- Add `OBSERVABILITY_PROVIDER`.
- Add `.env.local.example`, `.env.gcp.example`, and `.env.aws.example`.
- Update docs so every environment variable has a purpose.

This is small and gives us clean deployment profiles.

### Phase 2: Object Storage Abstraction

- Add `StorageProvider` interface.
- Implement local provider using the current file path behavior.
- Add placeholder or real GCS provider.
- Add placeholder or real S3 provider.
- Change ingestion to use the storage provider instead of assuming a mounted folder.

This is the most important cloud-compatibility change because local folder mounts do not translate cleanly to Cloud Run or ECS.

### Phase 3: Cloud AI Provider Adapters

- Add `VertexAIProvider`.
- Add `BedrockProvider`.
- Add model route settings for each.
- Keep mock provider as default for local tests.
- Keep OpenAI-compatible provider for local Ollama/vLLM-style deployments.

This makes the assistant deployable in either cloud without changing the chat orchestration.

### Phase 4: Deployment Manifests

- Add production frontend Dockerfile.
- Add production Docker Compose profile for local production testing.
- Add Terraform for GCP.
- Add Terraform for AWS.
- Inject env vars and secrets through Cloud Run or ECS task definitions.

### Phase 5: Observability And Secrets

- Add OpenTelemetry exporter settings.
- Keep structured JSON logs.
- Add cloud-native log correlation.
- Add secret provider abstraction only if runtime secret fetching is required.

In many deployments, we may not need app-level secret fetching. Cloud Run and ECS can inject secrets as environment variables. That is simpler.

## Alternative Low-Work Approach

If the full adapter strategy is too much work now, use this simpler approach:

1. Keep the app container cloud-neutral.
2. Use only environment variables for cloud differences.
3. Keep PostgreSQL, Redis, and API calls standard.
4. Use S3/GCS only through signed URLs or backend upload endpoints later.
5. Use `openai_compatible` as the common LLM adapter where possible.
6. Deploy separate cloud-specific infrastructure, but keep the application image the same.

This gives portability with less code:

```text
Same backend image
Same frontend image
Different env vars
Different managed Postgres
Different managed Redis
Different API base URL
Different LLM endpoint/provider config
```

The tradeoff is that object storage, Bedrock, Vertex AI, and cloud-native observability remain less integrated until later.

## Decision Recommendation

Use the full strategy, but implement it in phases.

Start with Phase 1 immediately because it is low effort and clarifies the deployment story.

Then prioritize Phase 2 because document ingestion is the first place local/cloud deployment will diverge.

Cloud AI adapters can come after the base cloud runtime works.

Recommended order:

```text
1. Environment profile cleanup
2. Production Dockerfiles
3. Storage provider abstraction
4. GCP Cloud Run deployment
5. AWS ECS Fargate deployment
6. Vertex AI and Bedrock adapters
7. OpenTelemetry/cloud observability
8. Advanced secret provider abstraction if needed
```

This path keeps the project flexible without over-engineering before deployment actually starts.
