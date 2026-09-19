# =============================================================================
# ECR Module — Variables
# =============================================================================

variable "repository_names" {
  description = "List of ECR repository names to create"
  type        = list(string)
  default = [
    "shrinklink-auth",
    "shrinklink-url",
    "shrinklink-analytics",
    "shrinklink-notification",
    "shrinklink-frontend",
  ]
}
