#!/usr/bin/env bash
# =============================================================================
# ShrinkLink — EKS Prerequisite Installer
# Installs Metrics Server and AWS Load Balancer Controller on a fresh cluster.
# =============================================================================
set -euo pipefail

# ─── Colours ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ─── Configuration (override via environment) ───────────────────────────────
CLUSTER_NAME="${CLUSTER_NAME:?'CLUSTER_NAME env var must be set (e.g. shrinklink-eks)'}"
ALB_ROLE_ARN="${ALB_ROLE_ARN:?'ALB_ROLE_ARN env var must be set (IRSA role ARN for LB controller)'}"
AWS_REGION="${AWS_REGION:-us-east-1}"
VPC_ID="${VPC_ID:-}"                  # optional; auto-detected if omitted
LB_CONTROLLER_VERSION="${LB_CONTROLLER_VERSION:-1.8.1}"

# ─── 1. Verify CLI prerequisites ────────────────────────────────────────────
info "Checking CLI prerequisites …"
for cmd in kubectl helm aws; do
  if ! command -v "$cmd" &>/dev/null; then
    error "'$cmd' is not installed. Please install it and re-run this script."
  fi
  info "  ✔ $(command -v "$cmd") — $($cmd version --short 2>/dev/null || $cmd --version 2>/dev/null | head -1)"
done

# Verify cluster connectivity
if ! kubectl cluster-info &>/dev/null; then
  error "Cannot reach the Kubernetes API. Run 'aws eks update-kubeconfig --name ${CLUSTER_NAME} --region ${AWS_REGION}' first."
fi
info "Connected to cluster: ${CLUSTER_NAME}"

# ─── 2. Install Kubernetes Metrics Server ────────────────────────────────────
info "Installing Metrics Server …"
METRICS_SERVER_URL="https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml"

if kubectl get deployment metrics-server -n kube-system &>/dev/null; then
  warn "Metrics Server already exists — skipping install."
else
  kubectl apply -f "${METRICS_SERVER_URL}"
  info "Metrics Server manifest applied."
fi

# ─── 3. Install AWS Load Balancer Controller (Helm) ─────────────────────────
info "Installing AWS Load Balancer Controller v${LB_CONTROLLER_VERSION} …"

# Auto-detect VPC ID if not provided
if [[ -z "${VPC_ID}" ]]; then
  VPC_ID=$(aws eks describe-cluster \
    --name "${CLUSTER_NAME}" \
    --region "${AWS_REGION}" \
    --query "cluster.resourcesVpcConfig.vpcId" \
    --output text)
  info "Auto-detected VPC_ID: ${VPC_ID}"
fi

# Add / update the EKS Helm chart repo
helm repo add eks https://aws.github.io/eks-charts 2>/dev/null || true
helm repo update

# Install or upgrade the controller
helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  --namespace kube-system \
  --set clusterName="${CLUSTER_NAME}" \
  --set serviceAccount.create=true \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="${ALB_ROLE_ARN}" \
  --set region="${AWS_REGION}" \
  --set vpcId="${VPC_ID}" \
  --set image.tag="v${LB_CONTROLLER_VERSION}" \
  --wait --timeout 300s

info "AWS Load Balancer Controller installed."

# ─── 4. Verify deployments ──────────────────────────────────────────────────
info "Verifying controller deployments …"

DEPLOYMENTS=("metrics-server" "aws-load-balancer-controller")
MAX_WAIT=180   # seconds
POLL=5

for deploy in "${DEPLOYMENTS[@]}"; do
  info "  Waiting for ${deploy} …"
  elapsed=0
  while true; do
    ready=$(kubectl get deployment "${deploy}" -n kube-system \
      -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    desired=$(kubectl get deployment "${deploy}" -n kube-system \
      -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")

    if [[ "${ready}" == "${desired}" && "${ready}" -gt 0 ]]; then
      info "  ✔ ${deploy}  (${ready}/${desired} replicas ready)"
      break
    fi

    if [[ ${elapsed} -ge ${MAX_WAIT} ]]; then
      error "Timed out waiting for ${deploy} to become ready (${elapsed}s elapsed)."
    fi

    sleep ${POLL}
    elapsed=$((elapsed + POLL))
  done
done

echo ""
info "══════════════════════════════════════════════════════════════"
info " All prerequisites installed and verified successfully."
info " You may now apply the ShrinkLink manifests:"
info "   kubectl apply -k k8s/base/"
info "══════════════════════════════════════════════════════════════"
