# =============================================================================
# IAM Module — Variables
# =============================================================================

variable "project_name" {
  description = "Project identifier for resource naming"
  type        = string
}

variable "oidc_provider_arn" {
  description = "ARN of the EKS OIDC provider"
  type        = string
}

variable "oidc_provider_url" {
  description = "URL of the EKS OIDC provider (without https:// prefix)"
  type        = string
}

variable "ecr_repository_arns" {
  description = "List of ECR repository ARNs for scoped CI/CD permissions"
  type        = list(string)
}
