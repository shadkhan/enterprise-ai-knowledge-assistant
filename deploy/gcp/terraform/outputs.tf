output "artifact_registry_repository" {
  description = "Artifact Registry repository."
  value       = google_artifact_registry_repository.app.name
}

output "artifact_registry_docker_url" {
  description = "Docker repository URL prefix."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app.repository_id}"
}

output "frontend_url" {
  description = "Frontend Cloud Run URL."
  value       = google_cloud_run_v2_service.frontend.uri
}

output "backend_url" {
  description = "Backend Cloud Run URL."
  value       = google_cloud_run_v2_service.backend.uri
}

output "worker_url" {
  description = "Worker Cloud Run URL. This is internal-only and mainly useful for diagnostics."
  value       = google_cloud_run_v2_service.worker.uri
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL connection name."
  value       = google_sql_database_instance.postgres.connection_name
}

output "redis_host" {
  description = "Memorystore Redis host."
  value       = google_redis_instance.redis.host
}

output "documents_bucket" {
  description = "Document storage bucket."
  value       = google_storage_bucket.documents.name
}

output "runtime_service_account" {
  description = "Runtime service account email."
  value       = google_service_account.runtime.email
}
