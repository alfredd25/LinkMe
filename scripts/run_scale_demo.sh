#!/usr/bin/env bash
# =============================================================================
# ShrinkLink — Autoscaling Demo Orchestrator
# =============================================================================
# Seeds a test URL, opens live HPA/pod watchers, then runs the k6 load test.
# Watch the HPA scale the url-service from 2 → 10 pods in real time.
#
# Prerequisites:
#   - kubectl configured for the EKS cluster
#   - k6 installed (https://k6.io/docs/get-started/installation/)
#   - curl, jq
#
# Usage:
#   export ALB_URL="http://k8s-shrinkli-xxxxx.us-east-1.elb.amazonaws.com"
#   bash scripts/run_scale_demo.sh
# =============================================================================
set -euo pipefail

# ─── Colours ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
header(){ echo -e "\n${BOLD}${CYAN}═══ $* ═══${NC}\n"; }

# ─── Configuration ───────────────────────────────────────────────────────────
ALB_URL="${ALB_URL:?'ALB_URL env var must be set (e.g. http://k8s-shrinkli-xxxxx.us-east-1.elb.amazonaws.com)'}"
ALB_URL="${ALB_URL%/}"   # strip trailing slash
NAMESPACE="shrinklink"
K6_SCRIPT="load-tests/redirect_load_test.js"
PIDS=()                  # background process tracker

# ─── Cleanup trap ────────────────────────────────────────────────────────────
cleanup() {
    echo ""
    info "Shutting down background watchers …"
    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    info "Done. All watchers stopped."
}
trap cleanup EXIT INT TERM

# ─── 1. Preflight checks ────────────────────────────────────────────────────
header "Preflight Checks"

for cmd in kubectl k6 curl jq; do
    if ! command -v "$cmd" &>/dev/null; then
        error "'$cmd' is not installed. Please install it and re-run."
    fi
    info "✔ $cmd"
done

# Verify cluster connectivity
if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
    error "Namespace '${NAMESPACE}' not found. Is kubectl configured for the right cluster?"
fi
info "✔ Connected to cluster, namespace '${NAMESPACE}' exists"

# ─── 2. Seed a test short link ──────────────────────────────────────────────
header "Seeding Test Short Link"

SEED_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${ALB_URL}/api/urls/shorten" \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com/shrinklink-load-test-target"}')

HTTP_CODE=$(echo "$SEED_RESPONSE" | tail -1)
BODY=$(echo "$SEED_RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" -lt 200 || "$HTTP_CODE" -ge 300 ]]; then
    error "Failed to seed short link (HTTP ${HTTP_CODE}): ${BODY}"
fi

SHORT_CODE=$(echo "$BODY" | jq -r '.short_code')
SHORT_URL=$(echo "$BODY" | jq -r '.short_url')

if [[ -z "$SHORT_CODE" || "$SHORT_CODE" == "null" ]]; then
    error "Could not parse short_code from response: ${BODY}"
fi

info "Created short link:"
info "  Code : ${SHORT_CODE}"
info "  URL  : ${SHORT_URL}"

# Verify redirect works
REDIRECT_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "${ALB_URL}/${SHORT_CODE}")
if [[ "$REDIRECT_STATUS" == "302" ]]; then
    info "✔ Redirect verified (HTTP 302)"
else
    warn "Redirect returned HTTP ${REDIRECT_STATUS} (expected 302) — proceeding anyway"
fi

# ─── 3. Show current HPA & pod state ────────────────────────────────────────
header "Current State (Before Load)"

echo -e "${CYAN}HPA:${NC}"
kubectl get hpa -n "$NAMESPACE" 2>/dev/null || warn "No HPA found"
echo ""
echo -e "${CYAN}URL Service Pods:${NC}"
kubectl get pods -l app=shrinklink-url -n "$NAMESPACE" -o wide 2>/dev/null || warn "No pods found"
echo ""

# ─── 4. Start background watchers ───────────────────────────────────────────
header "Starting Live Watchers"

# HPA watcher
info "Watcher 1: HPA status (output prefixed with [HPA])"
kubectl get hpa -n "$NAMESPACE" -w 2>/dev/null \
    | sed "s/^/[HPA]  /" &
PIDS+=($!)

# Pod watcher
info "Watcher 2: Pod lifecycle (output prefixed with [POD])"
kubectl get pods -l app=shrinklink-url -n "$NAMESPACE" -w 2>/dev/null \
    | sed "s/^/[POD]  /" &
PIDS+=($!)

# Brief pause so watcher headers print before k6 output
sleep 2

# ─── 5. Run the k6 load test ────────────────────────────────────────────────
header "Running k6 Load Test"

info "Target   : ${ALB_URL}/${SHORT_CODE}"
info "Script   : ${K6_SCRIPT}"
info "Duration : ~8 minutes (1m ramp + 2m ramp + 3m sustain + 2m cooldown)"
echo ""

k6 run \
    -e "ALB_URL=${ALB_URL}" \
    -e "SHORT_CODE=${SHORT_CODE}" \
    "$K6_SCRIPT"

K6_EXIT=$?

# ─── 6. Post-test snapshot ──────────────────────────────────────────────────
header "Post-Test State"

echo -e "${CYAN}HPA:${NC}"
kubectl get hpa -n "$NAMESPACE" 2>/dev/null || true
echo ""
echo -e "${CYAN}URL Service Pods:${NC}"
kubectl get pods -l app=shrinklink-url -n "$NAMESPACE" -o wide 2>/dev/null || true
echo ""

if [[ $K6_EXIT -eq 0 ]]; then
    echo -e "${GREEN}${BOLD}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  ✅  Load test PASSED — all SLO thresholds met!            ║"
    echo "║  Watch the HPA scale-down over the next ~5 minutes         ║"
    echo "║  (stabilizationWindowSeconds: 300)                         ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
else
    echo -e "${RED}${BOLD}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  ❌  Load test FAILED — one or more thresholds breached    ║"
    echo "║  Review the k6 summary above for details                   ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
fi

info "Background watchers will be cleaned up on exit."
info "To continue watching scale-down, run:"
info "  kubectl get hpa -n ${NAMESPACE} -w"

exit $K6_EXIT
