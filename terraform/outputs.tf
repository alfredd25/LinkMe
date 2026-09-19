# =============================================================================
# Root Outputs
# =============================================================================

# --- Networking ---
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

# --- EKS ---
output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "Endpoint URL for the EKS API server"
  value       = module.eks.cluster_endpoint
}

# --- RDS ---
output "rds_endpoint" {
  description = "RDS PostgreSQL connection endpoint (host:port)"
  value       = module.rds.endpoint
}

# --- ElastiCache ---
output "redis_endpoint" {
  description = "Redis primary endpoint address"
  value       = module.elasticache.endpoint
}

# --- ECR ---
output "ecr_repository_urls" {
  description = "Map of ECR repository names to their URLs"
  value       = module.ecr.repository_urls
}

# --- IAM ---
output "alb_controller_role_arn" {
  description = "IRSA role ARN for AWS Load Balancer Controller"
  value       = module.iam.alb_controller_role_arn
}

output "cicd_role_arn" {
  description = "CI/CD (Jenkins) IAM role ARN"
  value       = module.iam.cicd_role_arn
}
