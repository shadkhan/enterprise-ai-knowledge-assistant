# Cheapest Practical Deployment For A Mid-Size Enterprise

## Goal

This document defines the lowest-cost architecture that is still reasonable for a mid-size enterprise deployment of the Enterprise AI Knowledge Assistant.

The goal is not to build the absolute cheapest possible system. The goal is to avoid waste while keeping:

- Secure identity and secrets.
- Managed database backups.
- Private data services.
- Basic high availability where it matters.
- Observability.
- Upgrade path to a stricter enterprise architecture.
- Reasonable operational effort for a small platform team.

## Recommendation

The cheapest practical enterprise option is:

```text
GCP-first:
Cloud Run + Cloud SQL PostgreSQL/pgvector + Cloud Storage + small Redis option + Gemini/Vertex AI
```

Use AWS as an equivalent enterprise option when the organization is already AWS-standard:

```text
AWS:
ECS Fargate + RDS PostgreSQL/pgvector + S3 + small Redis option + Amazon Bedrock
```

If the company is not locked into AWS, GCP Cloud Run is usually the cheaper and simpler starting point for a bursty assistant because API and frontend services can scale to zero or near-zero. AWS ECS Fargate is excellent, but ECS tasks, ALB, NAT, RDS, and Redis tend to create a more noticeable fixed monthly base.

## Cheapest GCP Architecture

```text
User
  -> Cloud Run frontend
  -> Cloud Run backend API
  -> Cloud SQL PostgreSQL with pgvector
  -> Cloud Storage for documents
  -> Redis only if needed
  -> Gemini / Vertex AI
```

### GCP Cost-Saving Choices

| Area | Cheapest Practical Choice |
| --- | --- |
| Frontend | Cloud Run, scale to zero where acceptable. |
| Backend API | Cloud Run with request-based billing and tuned concurrency. |
| Worker | Cloud Run Jobs for batch ingestion, or one low-resource worker only when needed. |
| Database | Cloud SQL PostgreSQL, start small, single-region, automated backups. |
| Vector search | pgvector in PostgreSQL, not a separate vector DB. |
| Redis | Avoid at first if possible; use only when async jobs/cache require it. |
| Documents | Cloud Storage Standard, lifecycle old files to cheaper classes. |
| AI | Use cost-efficient Gemini model for default route, stronger model only for complex/high-risk prompts. |
| Load balancer | Start with Cloud Run HTTPS domain mapping; add external HTTPS LB + Cloud Armor when production security requires it. |
| Observability | Keep structured logs but set retention and sampling early. |

### GCP Lowest-Cost Production Shape

| Component | Initial Sizing Direction |
| --- | --- |
| Frontend | 0 min instances, low CPU/memory, autoscale on request. |
| Backend API | 0 or 1 min instance depending on latency target. |
| Worker | Run as job or scheduled/burst worker, not 24/7 if ingestion is periodic. |
| Cloud SQL | Small Postgres instance, SSD storage sized to actual data, backups enabled. |
| Redis | Skip initially or use smallest managed tier; add HA later. |
| Storage | One bucket with lifecycle policy. |
| AI | Cheap default model, token limits, cache, retrieval compression. |

## Cheapest AWS Architecture

```text
User
  -> CloudFront optional
  -> ALB
  -> ECS Fargate frontend
  -> ECS Fargate backend API
  -> RDS PostgreSQL with pgvector
  -> S3 for documents
  -> Redis only if needed
  -> Amazon Bedrock
```

### AWS Cost-Saving Choices

| Area | Cheapest Practical Choice |
| --- | --- |
| Frontend | Prefer S3 + CloudFront if the frontend can be exported/static; otherwise ECS Fargate. |
| Backend API | ECS Fargate with small task sizes and autoscaling. |
| Worker | ECS scheduled task or small always-on worker only if queue requires it. |
| Database | RDS PostgreSQL, start small, single-AZ for non-critical lower environments, Multi-AZ for prod if required. |
| Vector search | pgvector in RDS/Aurora before adding OpenSearch or a vector DB. |
| Redis | Avoid at first if possible; use ElastiCache only when queue/cache is necessary. |
| Documents | S3 Standard with lifecycle to Intelligent-Tiering or infrequent access. |
| AI | Use cheaper Bedrock model route by default; reserve stronger models for complex queries. |
| NAT | Minimize NAT Gateway use; use VPC endpoints for S3, ECR, CloudWatch, Secrets Manager where practical. |
| Load balancer | Use one ALB with host/path routing instead of one ALB per service. |

### AWS Lowest-Cost Production Shape

| Component | Initial Sizing Direction |
| --- | --- |
| Frontend | S3 + CloudFront if static export works; otherwise one small Fargate service. |
| Backend API | One small Fargate service with autoscaling. |
| Worker | Scheduled Fargate task or one small service. |
| RDS | Small Postgres instance, storage autoscaling, backups enabled. |
| Redis | Skip initially or use smallest ElastiCache option. |
| Storage | One S3 bucket with lifecycle policy. |
| AI | Cheap Bedrock model by default, strict token budgets. |

## Cheapest Option Decision

| Requirement | Cheapest Practical Choice |
| --- | --- |
| Lowest fixed cost for bursty usage | GCP Cloud Run |
| AWS-standard organization | AWS ECS Fargate |
| Minimum operations | GCP Cloud Run or AWS ECS Fargate |
| Long-running worker simplicity | AWS ECS Fargate |
| Bursty ingestion jobs | GCP Cloud Run Jobs or AWS scheduled Fargate tasks |
| Existing Google Workspace/GCP identity/data | GCP |
| Existing AWS landing zone/security team | AWS |
| Heavy custom ML training | AWS SageMaker or GCP Vertex AI custom training, but this is not cheapest |
| Lowest RAG architecture complexity | PostgreSQL + pgvector on either cloud |

## What Not To Use Initially

Avoid these in the cheapest mid-size enterprise version:

| Avoid Initially | Reason |
| --- | --- |
| GKE or EKS | Adds cluster, node, platform, security, and operations overhead. |
| Dedicated vector database | pgvector is enough for the first production scale unless latency/recall proves otherwise. |
| SageMaker custom endpoints | Useful for custom ML, but expensive and operationally heavier than Bedrock for GenAI inference. |
| Multi-region active-active | Expensive and complex; start with single-region plus backups. |
| Always-on large workers | Use jobs or small workers until ingestion volume proves the need. |
| Overly verbose tracing/logging | Observability bills can grow quickly. |
| Premium models for every query | Route simple questions to cheaper models. |

## Mid-Size Enterprise Cost Target

A reasonable starting monthly target:

```text
Lean production infrastructure, excluding AI token usage:
  GCP: roughly $300 to $1,000/month
  AWS: roughly $400 to $1,200/month

With AI token usage:
  Add model cost based on request volume, context size, output length, embeddings, and evaluations.
```

For a mid-size enterprise using the assistant actively, total cost may move into:

```text
$1,000 to $5,000+/month
```

The main variable is not frontend/backend hosting. The main variable is AI usage.

## Cost Controls That Matter Most

Implement these before opening the assistant to many users:

1. Per-request token budget.
2. Department/user monthly budget.
3. Cheap default model route.
4. Strong model route only for complex/high-risk questions.
5. Retrieval top-k limit.
6. Reranking before adding long context.
7. Semantic answer cache.
8. Retrieval cache.
9. Max output length.
10. Async summarization for large documents.
11. Logging retention policy.
12. Object storage lifecycle rules.
13. DB and Redis right-sizing review every month.
14. Cost dashboard by environment, model, user, and department.

## Suggested Cheapest Rollout

### Phase 1: Lean Dev

- One dev environment.
- Cloud Run or ECS Fargate.
- Small PostgreSQL.
- No HA Redis.
- Object storage bucket.
- Mock or cheapest model route for most tests.
- Short log retention.

### Phase 2: Lean Production

- Single-region prod.
- Managed PostgreSQL with backups.
- Small Redis only if needed.
- One API, one frontend, one worker/job path.
- WAF/rate limiting.
- Secrets manager.
- Basic dashboards and alerts.
- Token budgets.

### Phase 3: Enterprise Hardening

- HA database if uptime target requires it.
- More formal WAF and private networking.
- CI/CD approvals.
- Restore tests.
- Audit logs.
- Golden evaluation in release pipeline.
- Cost showback by department.

### Phase 4: Scale Only When Proven

- Add more workers.
- Add dedicated queue service.
- Add separate vector search.
- Add GKE/EKS if platform requirements justify it.
- Add SageMaker or Vertex custom training only if custom ML becomes necessary.

## Final Recommendation

For the cheapest practical mid-size enterprise deployment, choose:

```text
GCP Cloud Run + Cloud SQL PostgreSQL/pgvector + Cloud Storage + Gemini/Vertex AI
```

Add Redis only when queueing and caching requirements justify the fixed cost.

If the company is already AWS-first, choose:

```text
AWS ECS Fargate + RDS PostgreSQL/pgvector + S3 + Amazon Bedrock
```

Keep the architecture single-region, managed, and container-based. Avoid Kubernetes, separate vector databases, and custom ML hosting until the product proves those costs are justified.

## Pricing References

- Google Cloud Run pricing: https://cloud.google.com/run/pricing
- Google Cloud SQL pricing: https://cloud.google.com/sql/pricing
- Google Cloud Storage pricing: https://cloud.google.com/storage/pricing
- Google Memorystore pricing: https://cloud.google.com/memorystore/docs/redis/pricing
- Google Gemini / Agent Platform pricing: https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing
- AWS Fargate pricing: https://aws.amazon.com/fargate/pricing/
- Amazon RDS PostgreSQL pricing: https://aws.amazon.com/rds/postgresql/pricing/
- Amazon S3 pricing: https://aws.amazon.com/s3/pricing/
- Amazon ElastiCache pricing: https://aws.amazon.com/elasticache/pricing/
- Amazon Bedrock pricing: https://aws.amazon.com/bedrock/pricing/
- AWS NAT Gateway pricing: https://aws.amazon.com/vpc/pricing/
- AWS Load Balancing pricing: https://aws.amazon.com/elasticloadbalancing/pricing/
