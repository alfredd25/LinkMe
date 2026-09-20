#!/usr/bin/env bash
# =============================================================================
# ShrinkLink — Jenkins Worker Bootstrap Script
# =============================================================================
# Installs Docker, AWS CLI v2, kubectl, and Trivy on an Ubuntu (22.04+) runner.
# Run with:  sudo bash scripts/setup_jenkins_worker.sh
# =============================================================================
set -euo pipefail

# ─── Colours ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ─── Require root ────────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  error "This script must be run as root (or via sudo)."
fi

export DEBIAN_FRONTEND=noninteractive
ARCH=$(dpkg --print-architecture)   # amd64 | arm64

info "Architecture: ${ARCH}"
info "Updating package index …"
apt-get update -qq

# =============================================================================
# 1. Docker Engine (official repo)
# =============================================================================
if command -v docker &>/dev/null; then
  warn "Docker already installed — $(docker --version)"
else
  info "Installing Docker Engine …"
  apt-get install -y -qq ca-certificates curl gnupg lsb-release

  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" \
    | tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin

  systemctl enable docker
  systemctl start docker

  # Allow jenkins user to run Docker without sudo
  if id "jenkins" &>/dev/null; then
    usermod -aG docker jenkins
    info "Added 'jenkins' user to docker group"
  fi

  info "Docker installed: $(docker --version)"
fi

# =============================================================================
# 2. AWS CLI v2
# =============================================================================
if command -v aws &>/dev/null; then
  warn "AWS CLI already installed — $(aws --version)"
else
  info "Installing AWS CLI v2 …"
  apt-get install -y -qq unzip
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip" -o /tmp/awscli.zip
  unzip -qo /tmp/awscli.zip -d /tmp
  /tmp/aws/install --update
  rm -rf /tmp/awscli.zip /tmp/aws
  info "AWS CLI installed: $(aws --version)"
fi

# =============================================================================
# 3. kubectl
# =============================================================================
KUBECTL_VERSION="${KUBECTL_VERSION:-v1.31.0}"

if command -v kubectl &>/dev/null; then
  warn "kubectl already installed — $(kubectl version --client --short 2>/dev/null || kubectl version --client)"
else
  info "Installing kubectl ${KUBECTL_VERSION} …"
  curl -fsSL "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${ARCH}/kubectl" \
    -o /usr/local/bin/kubectl
  chmod +x /usr/local/bin/kubectl
  info "kubectl installed: $(kubectl version --client --short 2>/dev/null || kubectl version --client)"
fi

# =============================================================================
# 4. Trivy (Aqua Security vulnerability scanner)
# =============================================================================
TRIVY_VERSION="${TRIVY_VERSION:-0.55.0}"

if command -v trivy &>/dev/null; then
  warn "Trivy already installed — $(trivy --version | head -1)"
else
  info "Installing Trivy v${TRIVY_VERSION} …"
  apt-get install -y -qq wget apt-transport-https

  wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key \
    | gpg --dearmor -o /etc/apt/keyrings/trivy.gpg
  echo \
    "deb [signed-by=/etc/apt/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb generic main" \
    | tee /etc/apt/sources.list.d/trivy.list > /dev/null

  apt-get update -qq
  apt-get install -y -qq trivy

  info "Trivy installed: $(trivy --version | head -1)"
fi

# =============================================================================
# 5. Helm (used by install-prereqs.sh, also useful on workers)
# =============================================================================
if command -v helm &>/dev/null; then
  warn "Helm already installed — $(helm version --short)"
else
  info "Installing Helm …"
  curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
  info "Helm installed: $(helm version --short)"
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
info "══════════════════════════════════════════════════════════════"
info " Jenkins worker bootstrap complete!"
info "  • Docker   : $(docker --version)"
info "  • AWS CLI  : $(aws --version 2>&1)"
info "  • kubectl  : $(kubectl version --client --short 2>/dev/null || kubectl version --client | head -1)"
info "  • Trivy    : $(trivy --version 2>&1 | head -1)"
info "  • Helm     : $(helm version --short 2>/dev/null)"
info ""
info " Restart the Jenkins agent to pick up group changes:"
info "   sudo systemctl restart jenkins"
info "══════════════════════════════════════════════════════════════"
