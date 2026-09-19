# =============================================================================
# Terraform Backend — S3 + DynamoDB State Locking
# =============================================================================
# Prerequisites: The S3 bucket and DynamoDB table must be created BEFORE
# running `terraform init`. Bootstrap them with:
#   aws s3api create-bucket --bucket shrinklink-tf-state-2026 --region us-east-1
#   aws dynamodb create-table \
#     --table-name shrinklink-tf-locks \
#     --attribute-definitions AttributeName=LockID,AttributeType=S \
#     --key-schema AttributeName=LockID,KeyType=HASH \
#     --billing-mode PAY_PER_REQUEST
# =============================================================================

terraform {
  backend "s3" {
    bucket         = "shrinklink-tf-state-2026"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "shrinklink-tf-locks"
    encrypt        = true
  }
}
