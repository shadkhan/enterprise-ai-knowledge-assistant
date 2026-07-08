# GCP And AWS Cloud Cost Comparison

## Purpose

This document compares the expected ongoing cloud cost profile for deploying the Enterprise AI Knowledge Assistant on GCP and AWS. It is not a final quote. Cloud costs vary by region, traffic, model choice, high availability settings, storage volume, egress, and committed-use discounts.

Use this document to understand the cost drivers, estimate monthly run rate, and choose a cost-conscious architecture before creating exact estimates in the official calculators.

Official calculators:

- Google Cloud Pricing Calculator: https://cloud.google.com/products/calculator
- AWS Pricing Calculator: https://calculator.aws/

## Current Application Cost Shape

The application has these runtime components:

| Component | Cost Type | Notes |
| --- | --- | --- |
| Next.js frontend | Compute + egress | Can be cheap if served from Cloud Run, CloudFront, or CDN. |
| FastAPI backend | Compute | Scales with API traffic, chat requests, admin actions, and ingestion callbacks. |
| Worker | Compute | Scales with document ingestion, parsing, chunking, embedding, and evaluations. |
| PostgreSQL + pgvector | Always-on database | Usually one of the largest fixed monthly costs. |
| Redis | Always-on cache/queue | Small Redis is manageable, but HA Redis adds cost. |
| Object storage | Storage + requests + egress | Usually cheap unless storing many documents or serving large downloads. |
| AI model calls | Token-based usage | Often the largest variable cost once users are active. |
| Load balancer / WAF / NAT | Fixed + usage | Easy to underestimate in enterprise networking. |
| Observability | Logs, metrics, traces | Can grow quickly if verbose logs or traces are retained too long. |

## Reference Usage Assumptions

Use these assumptions for a mid-size enterprise planning estimate:

| Metric | Assumption |
| --- | --- |
| Enabled users | 300 to 1,000 |
| Daily active users | 75 to 250 |
| Chat requests per active user per day | 5 to 20 |
| Monthly chat requests | 50,000 to 150,000 |
| Average LLM input tokens per request | 3,000 to 8,000 |
| Average LLM output tokens per request | 500 to 1,500 |
| Stored documents | 50 GB to 500 GB |
| PostgreSQL storage | 50 GB to 300 GB |
| Redis memory | 1 GB to 8 GB |
| Ingestion volume | 1,000 to 20,000 documents per month |
| Availability target | Single-region production, optional HA database |

If the assistant becomes heavily used, AI token cost can overtake infrastructure cost. If usage is light, database, Redis, networking, and load balancers dominate.

## GCP Cost Drivers

| Layer | GCP Service | Main Cost Drivers |
| --- | --- | --- |
| Frontend | Cloud Run or Cloud CDN + Cloud Run | vCPU-seconds, GiB-seconds, requests, egress, min instances. |
| Backend API | Cloud Run | vCPU-seconds, GiB-seconds, requests, concurrency, min instances, VPC access. |
| Worker | Cloud Run or GKE Autopilot | Always-allocated CPU, job duration, memory, ingestion volume. |
| Database | Cloud SQL PostgreSQL | vCPU, memory, storage, HA/failover, backups, replicas, egress. |
| Redis | Memorystore | Tier, capacity, HA, region. |
| Storage | Cloud Storage | GB stored, storage class, operations, retrieval, egress. |
| AI | Vertex AI / Gemini | Input tokens, output tokens, cached tokens, grounding, agent/runtime features. |
| Edge | Load Balancing + Cloud Armor | Forwarding rules, processed traffic, policies/rules. |
| Observability | Cloud Logging / Monitoring / Trace | Ingested logs, retained logs, metrics, traces. |

Important pricing references:

- Cloud Run charges for used resources, with free tier and region-dependent pricing. It supports request-based and instance-based billing. Source: https://cloud.google.com/run/pricing
- Cloud SQL pricing depends on provisioned CPU, memory, storage, region, networking, and IP usage. Source: https://cloud.google.com/sql/pricing
- Memorystore pricing is based on provisioned capacity/tier and region. Source: https://cloud.google.com/memorystore/docs/redis/pricing
- Cloud Storage pricing depends on storage class, operations, retrieval, and data transfer. Source: https://cloud.google.com/storage/pricing
- Cloud Load Balancing includes forwarding rule and traffic-related charges. Source: https://cloud.google.com/load-balancing/pricing
- Gemini / Agent Platform pricing is token and feature based. Source: https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing

## AWS Cost Drivers

| Layer | AWS Service | Main Cost Drivers |
| --- | --- | --- |
| Frontend | ECS Fargate behind ALB, optionally CloudFront | vCPU, memory, task runtime, ALB, egress, CDN. |
| Backend API | ECS Fargate | vCPU, memory, task runtime, task count, service autoscaling. |
| Worker | ECS Fargate | Always-running task count, vCPU, memory, ingestion volume. |
| Database | RDS or Aurora PostgreSQL | Instance class, storage, Multi-AZ, backups, replicas, I/O. |
| Redis | ElastiCache | Node type, node count, serverless usage, HA, region. |
| Storage | S3 | GB stored, requests, lifecycle class, retrieval, egress. |
| AI | Amazon Bedrock | Input tokens, output tokens, model choice, provisioned throughput, guardrails/agents. |
| Edge | ALB + WAF + CloudFront | ALB hours, LCU, WAF ACL/rules/requests, CDN traffic. |
| Networking | NAT Gateway | NAT hours, GB processed, number of AZs. |
| Observability | CloudWatch / X-Ray | Logs ingested, retained logs, metrics, traces, dashboards. |

Important pricing references:

- Fargate pricing is based on vCPU, memory, OS, architecture, storage, and task runtime. Source: https://aws.amazon.com/fargate/pricing/
- ECS itself has no extra charge; you pay for the underlying resources. Source: https://aws.amazon.com/ecs/pricing/
- RDS pricing depends on database engine, instance type, storage, deployment option, and usage. Source: https://aws.amazon.com/rds/postgresql/pricing/
- ElastiCache pricing has on-demand, serverless, and savings-plan options. Source: https://aws.amazon.com/elasticache/pricing/
- S3 Standard storage has tiered GB-month pricing plus request and transfer costs. Source: https://aws.amazon.com/s3/pricing/
- ALB includes hourly and LCU charges. Source: https://aws.amazon.com/elasticloadbalancing/pricing/
- NAT Gateway charges per hour and per GB processed. Source: https://aws.amazon.com/vpc/pricing/
- WAF charges by web ACL, rules, and inspected requests. Source: https://aws.amazon.com/waf/pricing/
- Bedrock pricing is model-specific and token-based. Source: https://aws.amazon.com/bedrock/pricing/

## Cost Model Formula

Use this simple model for both clouds:

```text
Monthly Cost =
  Frontend compute
+ Backend compute
+ Worker compute
+ PostgreSQL
+ Redis
+ Object storage
+ Load balancer / WAF / CDN
+ NAT / VPC egress
+ Logs / metrics / traces
+ AI model tokens
+ Backup / snapshot storage
+ Support plan
```

AI model cost estimate:

```text
Monthly LLM Cost =
  (monthly input tokens / 1,000,000 * input price per 1M tokens)
+ (monthly output tokens / 1,000,000 * output price per 1M tokens)
+ embedding tokens
+ reranking/model evaluation tokens
+ grounding/search/agent feature charges
```

Example token volume:

```text
100,000 chat requests/month
Average 5,000 input tokens/request
Average 1,000 output tokens/request

Input tokens = 500,000,000/month
Output tokens = 100,000,000/month
```

At this volume, model choice matters more than small differences in container pricing.

## Rough Monthly Cost Bands

These are planning bands, not quotes.

| Scenario | GCP Expected Band | AWS Expected Band | Notes |
| --- | ---: | ---: | --- |
| Developer / demo | $50 to $250 | $75 to $300 | Scale-to-zero helps GCP. AWS costs rise if ALB, NAT, RDS, or ECS tasks run 24/7. |
| Small production | $300 to $1,000 | $400 to $1,200 | Managed DB + Redis + WAF/LB become the fixed base. |
| Mid-size enterprise | $1,000 to $5,000+ | $1,200 to $6,000+ | AI usage, HA database, logs, and networking dominate. |
| Heavy production | $5,000 to $25,000+ | $5,000 to $30,000+ | Token volume, document ingestion, HA/multi-region, and support plans drive cost. |

The infrastructure-only cost may stay modest. The AI cost can become the largest bill if users submit many long prompts or the system retrieves large context windows.

## GCP Versus AWS Cost Observations

| Area | Lower-Cost Tendency |
| --- | --- |
| Very low traffic API/frontend | GCP Cloud Run often wins because services can scale to zero. |
| Always-on containers | AWS Fargate and GCP Cloud Run instance-based billing are both viable; exact cost depends on CPU/memory sizing. |
| Worker process | AWS ECS Fargate is simple for always-on workers; GCP Cloud Run can be cheaper for bursty jobs but needs care for long-running workers. |
| Database | Depends heavily on instance class, HA, storage, and commitments. Cloud SQL and RDS both become major fixed costs. |
| Redis | Small Redis can be a surprisingly large fixed cost on both clouds if managed HA is enabled. |
| Object storage | Usually low cost on both; egress and request patterns matter more than raw storage. |
| Load balancer | AWS ALB has a clear fixed monthly base; GCP load balancing also has forwarding rule and traffic costs. |
| NAT | AWS NAT Gateway can become a noticeable fixed cost. GCP VPC connector / NAT costs also need review. |
| AI models | Depends on selected model, token volume, caching, and output length. No provider is always cheapest. |

## Cost Risks

| Risk | Why It Happens | Mitigation |
| --- | --- | --- |
| Token cost explosion | Large retrieved context, verbose answers, heavy usage, expensive model routing | Token budgets, model routing, caching, context compression, answer length limits. |
| NAT surprise | Private services route internet-bound traffic through NAT | Use VPC endpoints/private service access where possible; monitor NAT GB. |
| Logging surprise | Debug logs and traces retained too long | Sampling, log levels, retention policies, exclusion filters. |
| Redis overprovisioning | Managed Redis minimum tiers can exceed actual need | Start small, monitor memory, avoid HA in dev. |
| Database overprovisioning | HA, replicas, large instance class, provisioned IOPS | Start with right-sized single-region DB; add HA for prod only. |
| Load balancer sprawl | Multiple environments/services each get their own LB | Consolidate routing where practical. |
| Egress | Large source preview/download traffic, public file serving | Use CDN, signed URLs, lifecycle policies, avoid unnecessary cross-region traffic. |

## Cost Optimization Plan

1. Start with one region.
2. Use managed containers, not Kubernetes, for the first production deployment.
3. Keep frontend and backend autoscaling conservative.
4. Use one database instance per environment.
5. Use pgvector before adding a separate vector database.
6. Use object storage lifecycle policies for raw and archived documents.
7. Add Redis only where caching/queueing gives measurable value.
8. Keep Cloud Run min instances at zero for dev and low for prod unless latency requires warm instances.
9. On AWS, avoid unnecessary NAT Gateway data paths; use VPC endpoints for AWS services where possible.
10. Route simple AI requests to cheaper models.
11. Cap max tokens per role/task.
12. Use semantic answer cache and retrieval cache.
13. Batch embeddings during ingestion.
14. Sample traces and reduce noisy logs.
15. Use committed-use discounts, savings plans, or reserved capacity only after baseline usage is known.

## Recommended Cost Governance Dashboard

Track these metrics from day one:

| Metric | Why |
| --- | --- |
| Cost by environment | Prevent dev/stage from quietly becoming expensive. |
| Cost by service | Identify database, Redis, model, NAT, and logging hotspots. |
| LLM cost by model | Decide when cheaper routing is safe. |
| LLM cost by department/user | Support chargeback/showback and abuse detection. |
| Input/output tokens per request | Detect long prompts and verbose outputs. |
| Cache hit rate | Quantify savings from retrieval and answer caching. |
| Ingestion cost per document | Understand parser, OCR, embedding, and indexing cost. |
| Cost per successful answer | Best product-level cost KPI. |

## Practical Recommendation

For the first enterprise deployment:

```text
GCP:
Cloud Run + Cloud SQL PostgreSQL/pgvector + Memorystore Redis + GCS + Gemini/Vertex AI

AWS:
ECS Fargate + RDS PostgreSQL/pgvector + ElastiCache Redis + S3 + Bedrock
```

For cost control:

- Keep the first deployment single-region.
- Use pgvector before adding a separate vector database.
- Avoid Kubernetes at the beginning.
- Avoid SageMaker unless custom ML training or private model hosting is required.
- Treat AI token spend as the main variable cost.
- Create exact estimates in the official calculators after selecting region, HA level, traffic target, model, and support tier.
