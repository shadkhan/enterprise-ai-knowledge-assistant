output "account_id" {
  description = "AWS account ID."
  value       = data.aws_caller_identity.current.account_id
}

output "backend_ecr_repository_url" {
  description = "Backend ECR repository URL."
  value       = aws_ecr_repository.backend.repository_url
}

output "frontend_ecr_repository_url" {
  description = "Frontend ECR repository URL."
  value       = aws_ecr_repository.frontend.repository_url
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name."
  value       = aws_lb.app.dns_name
}

output "frontend_url" {
  description = "Frontend URL."
  value       = "http://${aws_lb.app.dns_name}"
}

output "backend_url" {
  description = "Backend base URL through ALB path routing."
  value       = "http://${aws_lb.app.dns_name}"
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint."
  value       = aws_db_instance.postgres.address
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint."
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "documents_bucket" {
  description = "Document storage bucket."
  value       = aws_s3_bucket.documents.bucket
}

output "ecs_cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.main.name
}

output "app_secret_arn" {
  description = "Secrets Manager application secret ARN."
  value       = aws_secretsmanager_secret.app.arn
}
