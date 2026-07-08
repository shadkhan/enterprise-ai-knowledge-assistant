# AWS Terraform Deployment

This folder contains the starter AWS Terraform deployment for the Enterprise AI Knowledge Assistant.

It provisions:

- ECR repositories for backend and frontend images.
- ECS Fargate cluster, services, and task definitions for frontend, backend API, and worker.
- Application Load Balancer with frontend and `/api/*` backend routing.
- RDS PostgreSQL for app data and pgvector.
- ElastiCache Redis for cache and ingestion jobs.
- S3 bucket for uploaded/source documents.
- VPC with public/private subnets, route tables, security groups, and optional NAT Gateway.
- IAM execution/runtime roles and CloudWatch log groups.

## Prerequisites

- Terraform installed.
- AWS CLI installed.
- Authenticated AWS credentials with permission to create ECS, ECR, RDS, ElastiCache, S3, IAM, VPC, ALB, and CloudWatch resources.
- Docker installed for image build/push.

## Layout

```text
deploy/aws/
  scripts/
    build-and-push-images.ps1
    terraform-apply.ps1
    terraform-bootstrap-ecr.ps1
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
Copy-Item deploy/aws/terraform/terraform.tfvars.example deploy/aws/terraform/terraform.tfvars
```

Edit:

```text
deploy/aws/terraform/terraform.tfvars
```

Then run:

```powershell
.\deploy\aws\scripts\terraform-init.ps1
.\deploy\aws\scripts\terraform-bootstrap-ecr.ps1
.\deploy\aws\scripts\build-and-push-images.ps1 -AwsRegion "us-east-1" -Tag "dev"
.\deploy\aws\scripts\terraform-plan.ps1
.\deploy\aws\scripts\terraform-apply.ps1
```

## Image Build Flow

The bootstrap step creates the ECR repositories first. Then the build script reads Terraform output and pushes:

```text
backend_image  -> ECR backend repo
frontend_image -> ECR frontend repo
worker_image   -> same as backend image
```

After pushing, set these in `terraform.tfvars` if you are not using the defaults:

```hcl
backend_image  = "123456789012.dkr.ecr.us-east-1.amazonaws.com/eaka-dev-backend:dev"
frontend_image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/eaka-dev-frontend:dev"
worker_image   = "123456789012.dkr.ecr.us-east-1.amazonaws.com/eaka-dev-backend:dev"
```

## Important Notes

The backend gets `DATABASE_URL` from AWS Secrets Manager in the ECS task definition. The secret value is still created by Terraform in this starter version, so it can appear in Terraform state. For stricter production, create secrets outside Terraform or use a separate restricted state.

The frontend talks to the backend through the same ALB using same-origin path routing by default. The frontend image is built with an empty `NEXT_PUBLIC_API_BASE_URL`, so browser calls like `/chat` and `/admin/settings` go back to the same ALB host and are routed to the backend target group.

The ECS services run in private subnets. NAT Gateway is enabled by default so tasks can pull images and call external APIs. For lower-cost or stricter enterprise networking, replace NAT traffic with VPC endpoints for ECR, S3, CloudWatch Logs, Secrets Manager, and Bedrock where appropriate.

References:

- ECS service Terraform resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- ECR repository Terraform resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_repository
- RDS instance Terraform resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- ElastiCache replication group Terraform resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
