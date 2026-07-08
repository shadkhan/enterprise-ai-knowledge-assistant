# GCP Terraform Deployment

This folder contains the starter GCP Terraform deployment for the Enterprise AI Knowledge Assistant.

It provisions:

- Artifact Registry repository for application images.
- Cloud Run services for frontend, backend API, and worker.
- Cloud SQL PostgreSQL for app data and pgvector.
- Memorystore Redis for cache and ingestion jobs.
- Cloud Storage bucket for uploaded/source documents.
- Runtime service account and IAM bindings.
- VPC and Serverless VPC Access connector for private Redis access.

## Prerequisites

- Terraform installed.
- Google Cloud CLI installed.
- Authenticated with `gcloud auth application-default login`.
- A GCP project with billing enabled.
- Permission to create Cloud Run, Cloud SQL, Memorystore, Artifact Registry, IAM, VPC, and Storage resources.

## Layout

```text
deploy/gcp/
  scripts/
    build-and-push-images.ps1
    terraform-bootstrap-registry.ps1
    terraform-apply.ps1
    terraform-destroy.ps1
    terraform-fmt-validate.ps1
    terraform-init.ps1
    terraform-plan.ps1
  terraform/
    versions.tf
    main.tf
    variables.tf
    outputs.tf
    terraform.tfvars.example
    backend.tf.example
```

## Quick Start

Copy the example variables file:

```powershell
Copy-Item deploy/gcp/terraform/terraform.tfvars.example deploy/gcp/terraform/terraform.tfvars
```

Edit:

```text
deploy/gcp/terraform/terraform.tfvars
```

Then run:

```powershell
.\deploy\gcp\scripts\terraform-init.ps1
.\deploy\gcp\scripts\terraform-bootstrap-registry.ps1
.\deploy\gcp\scripts\build-and-push-images.ps1 -ProjectId "your-project-id" -Region "us-central1" -Repository "eaka" -Tag "dev"
.\deploy\gcp\scripts\terraform-plan.ps1
.\deploy\gcp\scripts\terraform-apply.ps1
```

## Image Build Flow

Before applying Cloud Run services, push container images to Artifact Registry.

After the Artifact Registry repository exists, run:

```powershell
.\deploy\gcp\scripts\build-and-push-images.ps1 `
  -ProjectId "your-project-id" `
  -Region "us-central1" `
  -Repository "eaka" `
  -Tag "dev"
```

Then set these in `terraform.tfvars`:

```hcl
backend_image  = "us-central1-docker.pkg.dev/your-project-id/eaka/backend:dev"
frontend_image = "us-central1-docker.pkg.dev/your-project-id/eaka/frontend:dev"
worker_image   = "us-central1-docker.pkg.dev/your-project-id/eaka/backend:dev"
```

## Important Notes

The current Terraform passes `DATABASE_URL` directly into Cloud Run. That is acceptable for a starter deployment, but the password can appear in Terraform state. For stricter enterprise deployment, move the full `DATABASE_URL` into Secret Manager and reference it from Cloud Run.

The frontend uses `NEXT_PUBLIC_API_BASE_URL`. In Next.js, public env vars are often baked into the client bundle at build time. For production, build the frontend image with the final backend API URL or use a runtime config endpoint/proxy pattern.

The Terraform enables the main APIs using `google_project_service`, but first-time projects can still need billing, org policy, quota, or IAM setup outside this module.

Cloud Run uses a Cloud SQL Unix socket mount for PostgreSQL and a Serverless VPC Access connector for Memorystore Redis.

References:

- Cloud Run v2 Terraform resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service
- Cloud SQL Terraform resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- Memorystore Terraform resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/redis_instance
- Artifact Registry Terraform resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/artifact_registry_repository
