# CI/CD Plan

## Purpose

This document defines the CI/CD strategy for the Enterprise AI Knowledge Assistant across local development, GCP deployment, and AWS deployment.

The goal is to prevent broken code, unsafe infrastructure, weak RAG behavior, and insecure containers from reaching production.

## Recommended Platform

Use GitHub Actions as the default CI/CD runner.

Reasons:

- Works well with Python, Node, Docker, Terraform, GCP, and AWS.
- Supports protected environments and manual approvals.
- Supports OpenID Connect to cloud providers.
- Avoids storing long-lived AWS or GCP credentials as GitHub secrets.
- Can publish test reports, scan results, Terraform plans, and deployment summaries.

If an enterprise already requires Jenkins, GitLab CI, Azure DevOps, Harness, or Spinnaker, keep the same gates and translate the workflow.

## Tooling

| Area | Recommended Tool |
| --- | --- |
| CI/CD runner | GitHub Actions |
| Cloud authentication | GitHub OIDC to GCP Workload Identity Federation and AWS IAM role assumption |
| Backend unit/API tests | `pytest` |
| Backend coverage | `pytest-cov` later |
| Frontend typecheck | `pnpm exec tsc --noEmit` |
| Frontend build | `pnpm build` |
| UI E2E tests | Playwright |
| RAG golden evals | Current in-repo golden evaluation runner |
| Advanced RAG evals | Ragas or DeepEval |
| Prompt/security regression | promptfoo |
| LLM observability/evals later | Langfuse |
| Terraform checks | `terraform fmt`, `terraform validate`, `terraform plan` |
| IaC policy | OPA / Conftest |
| Container scan | Trivy |
| Python dependency audit | `pip-audit` |
| JS dependency audit | `pnpm audit`, Dependabot, or GitHub code scanning |
| SBOM | Syft or Trivy SBOM |

## Pipeline Overview

```text
Pull Request
  -> lint/typecheck/build
  -> backend tests
  -> golden eval smoke test
  -> Docker build check
  -> Terraform fmt/validate/plan
  -> security scans
  -> policy checks

Merge to main
  -> build immutable images
  -> scan images
  -> push to registry
  -> terraform plan
  -> deploy dev
  -> smoke tests
  -> golden evals

Stage / Prod
  -> manual approval
  -> reviewed Terraform plan
  -> deploy
  -> smoke tests
  -> golden evals
  -> publish deployment summary
```

## Pull Request Gates

Every PR should run:

| Gate | Command / Practice | Blocks PR |
| --- | --- | --- |
| Backend tests | `pytest` | Yes |
| Frontend typecheck | `pnpm exec tsc --noEmit` | Yes |
| Frontend build | `pnpm build` | Yes |
| Golden eval smoke | Existing admin/evaluation pytest or CLI runner | Yes |
| Docker build | Backend and frontend image build | Yes |
| Terraform format | `terraform fmt -check -recursive` | Yes |
| Terraform validate | `terraform validate` | Yes |
| Terraform plan | Plan for touched deployment target | Review required |
| Dependency scan | `pip-audit`, `pnpm audit` | Block on critical/high by policy |
| Container scan | Trivy | Block on critical/high by policy |
| IaC policy | OPA/Conftest | Yes for severe policy violations |

## Backend Test Strategy

Current baseline:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
```

CI baseline:

```text
uv sync --frozen --group dev
uv run pytest -q
```

Recommended next additions:

- Add `pytest-cov`.
- Enforce minimum coverage after core modules stabilize.
- Split tests into:
  - unit tests
  - API route tests
  - repository tests
  - ingestion tests
  - retrieval tests
  - evaluation tests

## Frontend Test Strategy

Current baseline:

```text
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm build
```

Recommended next additions:

- Add Playwright for browser checks.
- Test assistant first-load behavior.
- Test chat submission.
- Test admin navigation.
- Test mobile layout smoke path.

Recommended Playwright flows:

| Flow | What It Proves |
| --- | --- |
| Assistant loads | Chat UI is visible without scrolling. |
| User asks question | Frontend can call backend and render answer. |
| Citation opens | Document source preview works. |
| Admin evaluations | Admin can run and view evaluations. |
| Mobile viewport | Layout scrolls correctly on small screens. |

## Evaluation Strategy

The application already has a golden evaluation foundation. That should be the first CI eval gate.

### PR Eval Gate

Run a small, deterministic set:

- Expected document is retrieved.
- Forbidden document is not leaked.
- Citations are present.
- Prompt metadata is returned.
- Evaluation endpoint succeeds.

### Stage Eval Gate

Run a larger dataset:

- Retrieval precision.
- Citation precision.
- Access-control leakage.
- Groundedness.
- Answer completeness.
- Latency and cost metadata.

### Production Monitoring

Run:

- Post-deploy golden evals.
- Nightly golden eval batch.
- Sampled real-answer evaluation.
- User feedback review.
- Regression alerts when scores fall below threshold.

## Recommended Eval Tools

Start with the in-repo golden runner because it is deterministic and cheap.

Then add:

| Tool | Use |
| --- | --- |
| Ragas | RAG metrics such as faithfulness, answer relevance, context precision, and context recall. |
| DeepEval | Pytest-style LLM tests and custom metrics. |
| promptfoo | Prompt regression, model comparison, jailbreak/red-team testing. |
| Langfuse | Production traces, annotations, eval dashboards, and LLM-as-judge monitoring. |

Recommended order:

```text
1. In-repo golden evals
2. promptfoo for prompt and red-team checks
3. Ragas or DeepEval for deeper RAG scoring
4. Langfuse for production trace/eval dashboard
```

## Terraform And Infrastructure Gates

For each cloud directory:

```text
terraform init
terraform fmt -check -recursive
terraform validate
terraform plan -out tfplan
terraform show -json tfplan > tfplan.json
conftest test tfplan.json
```

Policy examples:

- No public database.
- No public Redis.
- Required tags/labels.
- Encryption enabled on storage.
- Log retention configured.
- Deletion protection required in prod.
- No wildcard admin IAM in prod.
- Cloud Run/ECS services must use dedicated service identities.

## Security Gates

Use layered security checks:

| Layer | Tool |
| --- | --- |
| Python dependencies | `pip-audit` |
| JavaScript dependencies | `pnpm audit` |
| Containers | Trivy |
| IaC misconfig | Trivy config scan, Checkov, or OPA/Conftest |
| Secrets | GitHub secret scanning, Gitleaks optional |
| SBOM | Syft or Trivy SBOM |

Block production deployment on:

- Critical vulnerabilities.
- High vulnerabilities without approved exception.
- Secret leaks.
- Public DB/Redis.
- Failed golden evals.
- Failed smoke tests.

## CD Environments

Use GitHub Environments:

| Environment | Trigger | Approval | Notes |
| --- | --- | --- | --- |
| `dev` | Merge to `main` | Optional | Fast feedback, cheaper settings. |
| `stage` | Manual workflow or release branch | Required | Production-like. |
| `prod` | Tagged release or manual promotion | Required | Strictest gates. |

## GCP CD Flow

```text
1. Authenticate with GCP using Workload Identity Federation.
2. Build backend image.
3. Build frontend image.
4. Scan images.
5. Push to Artifact Registry.
6. Run Terraform plan in deploy/gcp/terraform.
7. Require approval for stage/prod.
8. Apply Terraform.
9. Smoke test Cloud Run backend /health and /ready.
10. Run golden evaluations.
11. Publish frontend/backend URLs and image tags.
```

## AWS CD Flow

```text
1. Authenticate with AWS using GitHub OIDC role assumption.
2. Build backend image.
3. Build frontend image.
4. Scan images.
5. Push to ECR.
6. Run Terraform plan in deploy/aws/terraform.
7. Require approval for stage/prod.
8. Apply Terraform.
9. Smoke test ALB /health and /ready.
10. Run golden evaluations.
11. Publish frontend/backend URLs and image tags.
```

## Smoke Tests

Required after every deploy:

```text
GET /health -> 200
GET /ready  -> 200
POST /chat  -> 200 for mock or configured provider
POST /admin/evaluations/run -> 200
```

For production, use a dedicated smoke-test user and test dataset.

## Promotion And Rollback

Use immutable image tags:

```text
backend:<git-sha>
frontend:<git-sha>
```

Promotion should reuse the same image digest across environments:

```text
dev -> stage -> prod
```

Rollback should be:

```text
1. Select previous known-good image tag.
2. Re-run Terraform apply with previous image.
3. Smoke test.
4. Run golden evals.
```

## Workflow Files To Add Later

Recommended GitHub Actions layout:

```text
.github/workflows/
  ci.yml
  terraform-gcp-plan.yml
  terraform-aws-plan.yml
  deploy-gcp.yml
  deploy-aws.yml
  nightly-evals.yml
  security-scan.yml
```

Recommended reusable workflows:

```text
.github/workflows/reusable-backend-test.yml
.github/workflows/reusable-frontend-test.yml
.github/workflows/reusable-docker-build-scan.yml
.github/workflows/reusable-terraform-plan.yml
```

## Minimum First Implementation

Start with:

1. `ci.yml`
   - Backend tests.
   - Frontend typecheck/build.
   - Golden eval smoke.

2. `terraform-gcp-plan.yml`
   - Terraform fmt/validate/plan for GCP.

3. `deploy-gcp.yml`
   - Build/push images.
   - Terraform apply.
   - Smoke tests.
   - Golden evals.

Then add AWS and deeper security/eval tools.

## References

- GitHub OIDC overview: https://docs.github.com/en/actions/concepts/security/openid-connect
- GitHub OIDC with AWS: https://docs.github.com/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- OPA Terraform policy: https://openpolicyagent.org/docs/terraform
- Conftest: https://openpolicyagent.org/ecosystem/entry/conftest
- Trivy GitHub Action: https://github.com/aquasecurity/trivy-action
- pip-audit: https://pypi.org/project/pip-audit/
- Playwright CI: https://playwright.dev/docs/ci-intro
- Ragas: https://docs.ragas.io/en/stable/
- DeepEval: https://deepeval.com/docs/introduction
- promptfoo: https://www.promptfoo.dev/docs/intro/
- Langfuse evaluations: https://langfuse.com/docs/evaluation/overview
