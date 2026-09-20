// =============================================================================
// ShrinkLink — k6 Redirect Load Test
// =============================================================================
// Simulates staged traffic ramping to trigger HPA autoscaling on the
// url-service deployment (2 → 10 replicas at 70% CPU threshold).
//
// Usage:
//   k6 run -e ALB_URL=http://<alb-dns> -e SHORT_CODE=<code> load-tests/redirect_load_test.js
// =============================================================================

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// ── Custom metrics ──────────────────────────────────────────────────────────
const failureRate = new Rate("failed_requests");
const redirectLatency = new Trend("redirect_latency", true); // in ms

// ── Configuration ───────────────────────────────────────────────────────────
export const options = {
  // Staged ramp profile matching HPA autoscaling lifecycle
  stages: [
    // Stage 1 — Warm-up: baseline traffic, HPA stays at minReplicas (2)
    { duration: "1m", target: 100 },

    // Stage 2 — Ramp: cross the 70% CPU threshold, HPA begins scaling up
    { duration: "2m", target: 350 },

    // Stage 3 — Sustained peak: hold at max load, HPA should reach maxReplicas (10)
    { duration: "3m", target: 350 },

    // Stage 4 — Ramp-down: traffic drops, HPA stabilization window (300s) kicks in
    { duration: "2m", target: 0 },
  ],

  // SLO-based thresholds
  thresholds: {
    // p95 redirect latency must stay below 150ms
    redirect_latency: ["p(95)<150"],

    // Less than 1% of requests may fail (non-2xx/3xx)
    failed_requests: ["rate<0.01"],

    // k6 built-in: overall p95 response time under 200ms
    http_req_duration: ["p(95)<200"],
  },

  // Do NOT follow HTTP redirects — we measure the 302 response itself
  noConnectionReuse: false,
  discardResponseBodies: true,
};

// ── Environment variables ───────────────────────────────────────────────────
const ALB_URL = __ENV.ALB_URL || "http://localhost:8002";
const SHORT_CODE = __ENV.SHORT_CODE || "test123";
const REDIRECT_URL = `${ALB_URL.replace(/\/$/, "")}/${SHORT_CODE}`;

// ── Setup: log test parameters ──────────────────────────────────────────────
export function setup() {
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  ShrinkLink Load Test                                      ║`);
  console.log(`║  Target  : ${REDIRECT_URL.padEnd(46)}║`);
  console.log(`║  Stages  : 10→100→350→350→0 VUs over 8 minutes             ║`);
  console.log(`║  SLOs    : p95 < 150ms, error rate < 1%                     ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

  // Verify the endpoint is reachable before ramping
  const probe = http.get(REDIRECT_URL, { redirects: 0 });
  if (probe.status !== 302 && probe.status !== 200) {
    console.warn(
      `⚠ Pre-flight check: ${REDIRECT_URL} returned HTTP ${probe.status} (expected 302). ` +
      `Load test will proceed but results may be unreliable.`
    );
  }

  return { redirectUrl: REDIRECT_URL };
}

// ── Main VU loop ────────────────────────────────────────────────────────────
export default function (data) {
  const params = {
    redirects: 0, // Do NOT follow redirects — measure 302 latency
    tags: { name: "redirect" },
    headers: {
      "User-Agent": "k6-shrinklink-loadtest/1.0",
    },
  };

  const res = http.get(data.redirectUrl, params);

  // Record custom metrics
  redirectLatency.add(res.timings.duration);

  // A request is "failed" if it's not a 302 redirect or 200 OK
  const passed = check(res, {
    "status is 302 (redirect)": (r) => r.status === 302,
    "response time < 200ms": (r) => r.timings.duration < 200,
    "has Location header": (r) => r.headers["Location"] !== undefined,
  });

  failureRate.add(!passed);

  // Small randomized think-time to simulate realistic user behavior
  sleep(Math.random() * 0.5 + 0.1); // 100ms–600ms
}

// ── Teardown: summary ───────────────────────────────────────────────────────
export function teardown(data) {
  console.log(`\n✅ Load test complete. Target was: ${data.redirectUrl}\n`);
}
