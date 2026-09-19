# =============================================================================
# IAM Module — Outputs
# =============================================================================

output "alb_controller_role_arn" {
  description = "ARN of the IRSA role for AWS Load Balancer Controller"
  value       = aws_iam_role.alb_controller.arn
}

output "cicd_role_arn" {
  description = "ARN of the CI/CD (Jenkins) IAM role"
  value       = aws_iam_role.cicd.arn
}

output "cicd_instance_profile_name" {
  description = "Instance profile name for the CI/CD role"
  value       = aws_iam_instance_profile.cicd.name
}
