variable "aws_region" {
  description = "AWS region."
  type        = string
  default     = "us-east-1"
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

variable "tags" {
  description = "Common AWS tags."
  type        = map(string)
  default = {
    App       = "enterprise-ai-knowledge-assistant"
    ManagedBy = "terraform"
  }
}

variable "vpc_cidr" {
  description = "VPC CIDR block."
  type        = string
  default     = "10.40.0.0/16"
}

variable "availability_zone_count" {
  description = "Number of availability zones to use."
  type        = number
  default     = 2
}

variable "enable_nat_gateway" {
  description = "Create NAT Gateway for private ECS task outbound access."
  type        = bool
  default     = true
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

variable "frontend_api_base_url" {
  description = "API base URL passed to frontend. Empty string uses same-origin backend path routing."
  type        = string
  default     = ""
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
  description = "Application database password."
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS PostgreSQL instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage_gb" {
  description = "Initial RDS storage in GB."
  type        = number
  default     = 50
}

variable "db_multi_az" {
  description = "Enable Multi-AZ RDS deployment."
  type        = bool
  default     = false
}

variable "db_deletion_protection" {
  description = "Protect RDS from accidental deletion. Keep true for production."
  type        = bool
  default     = true
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type."
  type        = string
  default     = "cache.t4g.micro"
}

variable "redis_num_cache_clusters" {
  description = "Number of Redis cache clusters."
  type        = number
  default     = 1
}

variable "document_bucket_name" {
  description = "Document storage bucket. Leave empty to generate one."
  type        = string
  default     = ""
}

variable "default_llm_provider" {
  description = "Default LLM provider passed to backend."
  type        = string
  default     = "mock"
}

variable "default_embedding_provider" {
  description = "Default embedding provider passed to backend."
  type        = string
  default     = "mock"
}

variable "backend_cpu" {
  description = "Backend Fargate CPU units."
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Backend Fargate memory MB."
  type        = number
  default     = 1024
}

variable "frontend_cpu" {
  description = "Frontend Fargate CPU units."
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Frontend Fargate memory MB."
  type        = number
  default     = 512
}

variable "worker_cpu" {
  description = "Worker Fargate CPU units."
  type        = number
  default     = 512
}

variable "worker_memory" {
  description = "Worker Fargate memory MB."
  type        = number
  default     = 1024
}

variable "backend_desired_count" {
  description = "Backend ECS desired task count."
  type        = number
  default     = 1
}

variable "frontend_desired_count" {
  description = "Frontend ECS desired task count."
  type        = number
  default     = 1
}

variable "worker_desired_count" {
  description = "Worker ECS desired task count. Set 0 for no always-on worker."
  type        = number
  default     = 1
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days."
  type        = number
  default     = 14
}

variable "alb_http_cidr_blocks" {
  description = "CIDR blocks allowed to reach ALB HTTP listener."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}
