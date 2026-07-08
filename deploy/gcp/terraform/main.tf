locals {
  resource_prefix      = "${var.name_prefix}-${var.environment}"
  bucket_name          = var.storage_bucket_name != "" ? var.storage_bucket_name : "${local.resource_prefix}-documents-${random_id.bucket_suffix.hex}"
  database_url         = "postgresql://${var.db_user}:${urlencode(var.db_password)}@/${var.db_name}?host=/cloudsql/${google_sql_database_instance.postgres.connection_name}"
  redis_url            = "redis://${google_redis_instance.redis.host}:${google_redis_instance.redis.port}/0"
  frontend_api_baseurl = var.public_api_base_url != "" ? var.public_api_base_url : google_cloud_run_v2_service.backend.uri

  common_env = {
    ENVIRONMENT                  = var.environment
    DEPLOYMENT_TARGET            = "gcp"
    DATABASE_URL                 = local.database_url
    REDIS_URL                    = local.redis_url
    AUTH_PROVIDER                = "oidc"
    OBSERVABILITY_PROVIDER       = "gcp"
    SECRETS_PROVIDER             = "gcp_secret_manager"
    OBJECT_STORAGE_PROVIDER      = "gcs"
    OBJECT_STORAGE_BUCKET        = google_storage_bucket.documents.name
    OBJECT_STORAGE_PREFIX        = "ingestion"
    INGESTION_WATCH_FOLDER       = "ingestion"
    INGESTION_ARCHIVE_FOLDER     = "archive"
    DEFAULT_LLM_PROVIDER         = var.default_llm_provider
    DEFAULT_EMBEDDING_PROVIDER   = var.default_embedding_provider
    VERTEX_LOCATION              = var.vertex_location
    ENABLE_DEMO_SEED             = "false"
    OPENAI_FALLBACK_TO_MOCK      = "false"
    CORS_ORIGINS                 = jsonencode(var.cors_origins)
    CORS_ORIGIN_REGEX            = var.cors_origin_regex
  }
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "google_project_service" "apis" {
  for_each = toset([
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "redis.googleapis.com",
    "vpcaccess.googleapis.com",
    "compute.googleapis.com",
    "secretmanager.googleapis.com",
    "aiplatform.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
  ])

  service            = each.key
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "app" {
  location      = var.region
  repository_id = var.artifact_repository_id
  description   = "Container images for ${local.resource_prefix}"
  format        = "DOCKER"
  labels        = var.labels

  depends_on = [google_project_service.apis]
}

resource "google_service_account" "runtime" {
  account_id   = "${local.resource_prefix}-runtime"
  display_name = "Runtime service account for ${local.resource_prefix}"

  depends_on = [google_project_service.apis]
}

resource "google_project_iam_member" "runtime_roles" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/storage.objectAdmin",
    "roles/secretmanager.secretAccessor",
    "roles/aiplatform.user",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
  ])

  project = var.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_compute_network" "main" {
  name                    = "${local.resource_prefix}-vpc"
  auto_create_subnetworks = false

  depends_on = [google_project_service.apis]
}

resource "google_compute_subnetwork" "main" {
  name          = "${local.resource_prefix}-subnet"
  region        = var.region
  network       = google_compute_network.main.id
  ip_cidr_range = "10.20.0.0/24"
}

resource "google_vpc_access_connector" "main" {
  name          = "${local.resource_prefix}-connector"
  region        = var.region
  network       = google_compute_network.main.name
  ip_cidr_range = "10.21.0.0/28"
  min_instances = 2
  max_instances = 3

  depends_on = [google_project_service.apis]
}

resource "google_storage_bucket" "documents" {
  name                        = local.bucket_name
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false
  labels                      = var.labels

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  depends_on = [google_project_service.apis]
}

resource "google_sql_database_instance" "postgres" {
  name             = "${local.resource_prefix}-postgres"
  region           = var.region
  database_version = "POSTGRES_16"

  settings {
    tier              = var.cloud_sql_tier
    availability_type = var.cloud_sql_availability_type
    disk_size         = var.cloud_sql_disk_size_gb
    disk_type         = "PD_SSD"
    disk_autoresize   = true

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
    }

    insights_config {
      query_insights_enabled = true
    }
  }

  deletion_protection = var.cloud_sql_deletion_protection

  depends_on = [google_project_service.apis]
}

resource "google_sql_database" "app" {
  name     = var.db_name
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "app" {
  name     = var.db_user
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}

resource "google_redis_instance" "redis" {
  name           = "${local.resource_prefix}-redis"
  region         = var.region
  tier           = var.redis_tier
  memory_size_gb = var.redis_memory_size_gb

  authorized_network = google_compute_network.main.id
  connect_mode       = "DIRECT_PEERING"
  redis_version      = "REDIS_7_0"
  labels             = var.labels

  depends_on = [google_project_service.apis]
}

resource "google_cloud_run_v2_service" "backend" {
  name     = "${local.resource_prefix}-backend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"
  labels   = var.labels

  template {
    service_account = google_service_account.runtime.email

    scaling {
      min_instance_count = var.backend_min_instances
      max_instance_count = var.backend_max_instances
    }

    vpc_access {
      connector = google_vpc_access_connector.main.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = var.backend_image

      ports {
        container_port = 8000
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
        startup_cpu_boost = true
      }

      dynamic "env" {
        for_each = local.common_env
        content {
          name  = env.key
          value = env.value
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.postgres.connection_name]
      }
    }
  }

  depends_on = [
    google_project_iam_member.runtime_roles,
    google_sql_database.app,
    google_sql_user.app,
    google_redis_instance.redis,
  ]
}

resource "google_cloud_run_v2_service" "worker" {
  name     = "${local.resource_prefix}-worker"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_ONLY"
  labels   = var.labels

  template {
    service_account = google_service_account.runtime.email

    scaling {
      min_instance_count = var.worker_min_instances
      max_instance_count = var.worker_max_instances
    }

    vpc_access {
      connector = google_vpc_access_connector.main.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image   = var.worker_image
      command = ["uv", "run", "python", "-m", "app.worker"]

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
        cpu_idle          = false
        startup_cpu_boost = true
      }

      dynamic "env" {
        for_each = local.common_env
        content {
          name  = env.key
          value = env.value
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.postgres.connection_name]
      }
    }
  }

  depends_on = [
    google_cloud_run_v2_service.backend,
  ]
}

resource "google_cloud_run_v2_service" "frontend" {
  name     = "${local.resource_prefix}-frontend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"
  labels   = var.labels

  template {
    service_account = google_service_account.runtime.email

    scaling {
      min_instance_count = var.frontend_min_instances
      max_instance_count = var.frontend_max_instances
    }

    containers {
      image = var.frontend_image

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        startup_cpu_boost = true
      }

      env {
        name  = "NEXT_PUBLIC_API_BASE_URL"
        value = local.frontend_api_baseurl
      }
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "backend_public" {
  count = var.allow_public_ingress ? 1 : 0

  location = google_cloud_run_v2_service.backend.location
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "frontend_public" {
  count = var.allow_public_ingress ? 1 : 0

  location = google_cloud_run_v2_service.frontend.location
  name     = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
