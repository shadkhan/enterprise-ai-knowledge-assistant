variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "GCP region for regional services."
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "dev"
}

variable "name_prefix" {
  description = "Prefix used for resource names."
  type        = string
  default     = "eaka"
}

variable "labels" {
  description = "Common labels applied to supported resources."
  type        = map(string)
  default = {
    app = "enterprise-ai-knowledge-assistant"
  }
}

variable "artifact_repository_id" {
  description = "Artifact Registry repository ID."
  type        = string
  default     = "eaka"
}

variable "backend_image" {
  description = "Backend API container image."
  type        = string
}

variable "frontend_image" {
  description = "Frontend container image."
  type        = string
}

variable "worker_image" {
  description = "Worker container image. Usually the same as backend_image."
  type        = string
}

variable "public_api_base_url" {
  description = "Public API base URL passed to the frontend container. Leave empty to use backend Cloud Run URI."
  type        = string
  default     = ""
}

variable "cors_origins" {
  description = "Explicit CORS origins for the backend."
  type        = list(string)
  default     = []
}

variable "cors_origin_regex" {
  description = "CORS origin regex for the backend. Default allows Cloud Run run.app URLs."
  type        = string
  default     = "^https://.*\\.run\\.app$"
}

variable "db_name" {
  description = "Application database name."
  type        = string
  default     = "knowledge"
}

variable "db_user" {
  description = "Application database user."
  type        = string
  default     = "app_user"
}

variable "db_password" {
  description = "Application database password. For stricter production, store the full DATABASE_URL in Secret Manager instead of Terraform state."
  type        = string
  sensitive   = true
}

variable "cloud_sql_tier" {
  description = "Cloud SQL machine tier."
  type        = string
  default     = "db-custom-1-3840"
}

variable "cloud_sql_availability_type" {
  description = "Cloud SQL availability type. Use REGIONAL for HA production."
  type        = string
  default     = "ZONAL"
}

variable "cloud_sql_disk_size_gb" {
  description = "Cloud SQL disk size in GB."
  type        = number
  default     = 50
}

variable "cloud_sql_deletion_protection" {
  description = "Protect Cloud SQL from accidental deletion. Keep true for production."
  type        = bool
  default     = true
}

variable "redis_memory_size_gb" {
  description = "Memorystore Redis memory size in GB."
  type        = number
  default     = 1
}

variable "redis_tier" {
  description = "Memorystore Redis tier."
  type        = string
  default     = "BASIC"
}

variable "storage_bucket_name" {
  description = "Document storage bucket. Leave empty to generate a name."
  type        = string
  default     = ""
}

variable "default_llm_provider" {
  description = "Default LLM provider passed to the backend."
  type        = string
  default     = "mock"
}

variable "default_embedding_provider" {
  description = "Default embedding provider passed to the backend."
  type        = string
  default     = "mock"
}

variable "vertex_location" {
  description = "Vertex AI location for future Vertex adapters."
  type        = string
  default     = "us-central1"
}

variable "backend_min_instances" {
  description = "Minimum backend Cloud Run instances."
  type        = number
  default     = 0
}

variable "backend_max_instances" {
  description = "Maximum backend Cloud Run instances."
  type        = number
  default     = 10
}

variable "frontend_min_instances" {
  description = "Minimum frontend Cloud Run instances."
  type        = number
  default     = 0
}

variable "frontend_max_instances" {
  description = "Maximum frontend Cloud Run instances."
  type        = number
  default     = 5
}

variable "worker_min_instances" {
  description = "Minimum worker Cloud Run instances. Set to 1 if Redis queue processing must always be active."
  type        = number
  default     = 0
}

variable "worker_max_instances" {
  description = "Maximum worker Cloud Run instances."
  type        = number
  default     = 2
}

variable "allow_public_ingress" {
  description = "Allow unauthenticated public invoker access to frontend and backend Cloud Run services."
  type        = bool
  default     = true
}
