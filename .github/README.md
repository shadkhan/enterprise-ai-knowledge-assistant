# GitHub Actions CI/CD Demo

This folder contains demo-ready CI/CD workflows.

They are intentionally safe by default:

- `ci.yml` runs backend tests, frontend checks, and Docker build smoke tests.
- `terraform-validate.yml` validates GCP and AWS Terraform without applying anything.
- `security-scan.yml` demonstrates dependency and container scans.
- `deploy-gcp.yml` and `deploy-aws.yml` are manual workflows and default to dry-run mode.

## Running Without Cloud Accounts

You can run:

```text
CI
Terraform Validate
Security Scan
```

without configuring GCP or AWS credentials.

The deploy workflows can also run in dry-run mode. They validate Terraform and build images locally but do not authenticate to cloud providers or apply infrastructure.

## Enabling Real GCP Deployment

Create GitHub environments such as:

```text
dev
stage
prod
```

Add environment variables:

```text
GCP_PROJECT_ID
GCP_REGION
GCP_ARTIFACT_REPOSITORY
GCP_WORKLOAD_IDENTITY_PROVIDER
GCP_DEPLOY_SERVICE_ACCOUNT
```

Then trigger `Deploy GCP` manually with:

```text
apply = true
```

## Enabling Real AWS Deployment

Create GitHub environments such as:

```text
dev
stage
prod
```

Add environment variables:

```text
AWS_REGION
AWS_ROLE_TO_ASSUME
```

Then trigger `Deploy AWS` manually with:

```text
apply = true
```

## Notes

For real production use:

- Use protected environments and required reviewers.
- Store Terraform state remotely.
- Use immutable image tags based on Git SHA.
- Add Terraform plan review before apply.
- Add smoke tests and golden evaluation checks after deployment.
