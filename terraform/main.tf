# =============================================================================
# Root Module — Wires All Infrastructure Modules Together
# =============================================================================

locals {
  cluster_name = "${var.project_name}-eks"
}

# =============================================================================
# 1. Networking
# =============================================================================
module "vpc" {
  source = "./modules/vpc"

  project_name = var.project_name
  vpc_cidr     = var.vpc_cidr
  cluster_name = local.cluster_name
}

# =============================================================================
# 2. Kubernetes Cluster
# =============================================================================
module "eks" {
  source = "./modules/eks"

  cluster_name       = local.cluster_name
  cluster_version    = var.eks_cluster_version
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.private_subnet_ids
}

# =============================================================================
# 3. Container Registry
# =============================================================================
module "ecr" {
  source = "./modules/ecr"
}

# =============================================================================
# 4. Database
# =============================================================================
module "rds" {
  source = "./modules/rds"

  project_name               = var.project_name
  vpc_id                     = module.vpc.vpc_id
  private_subnet_ids         = module.vpc.private_subnet_ids
  eks_node_security_group_id = module.eks.node_security_group_id
  db_name                    = var.db_name
  db_username                = var.db_username
  db_password                = var.db_password
}

# =============================================================================
# 5. Cache
# =============================================================================
module "elasticache" {
  source = "./modules/elasticache"

  project_name               = var.project_name
  vpc_id                     = module.vpc.vpc_id
  private_subnet_ids         = module.vpc.private_subnet_ids
  eks_node_security_group_id = module.eks.node_security_group_id
}

# =============================================================================
# 6. IAM (IRSA + CI/CD)
# =============================================================================
module "iam" {
  source = "./modules/iam"

  project_name        = var.project_name
  oidc_provider_arn   = module.eks.oidc_provider_arn
  oidc_provider_url   = module.eks.oidc_provider_url
  ecr_repository_arns = values(module.ecr.repository_arns)
}
