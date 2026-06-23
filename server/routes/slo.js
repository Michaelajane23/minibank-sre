const { Router } = require('express');
const { metrics } = require('../observability/metrics');

const router = Router();

// SLO definitions
const SLO_TARGETS = {
  availability: 99.5,   // 99.5% of requests succeed (no 5xx)
  latency_p95: 1000,    // p95 latency under 1000ms
  latency_p99: 3000     // p99 latency under 3000ms
};

// GET /slo — current SLI/SLO status and error budget
router.get('/slo', (req, res) => {
  const windowMinutes = parseInt(req.query.window) || 60; // default 1 hour
  const data = metrics.data || [];
  const since = Date.now() - (windowMinutes * 60 * 1000);
  const windowData = data.filter(d => d.timestamp > since);

  const totalRequests = windowData.length;
  const totalErrors = windowData.filter(d => d.statusCode >= 500).length;
  const successRate = totalRequests > 0 ? ((totalRequests - totalErrors) / totalRequests) * 100 : 100;

  const latencies = windowData.map(d => d.responseTimeMs).sort((a, b) => a - b);
  const p95 = latencies.length > 0 ? latencies[Math.ceil(0.95 * latencies.length) - 1] || 0 : 0;
  const p99 = latencies.length > 0 ? latencies[Math.ceil(0.99 * latencies.length) - 1] || 0 : 0;

  // Error budget calculation
  // If SLO is 99.5%, error budget = 0.5% of total requests
  const errorBudgetTotal = Math.floor(totalRequests * ((100 - SLO_TARGETS.availability) / 100));
  const errorBudgetConsumed = totalErrors;
  const errorBudgetRemaining = Math.max(errorBudgetTotal - errorBudgetConsumed, 0);
  const errorBudgetPercent = errorBudgetTotal > 0 ? ((errorBudgetConsumed / errorBudgetTotal) * 100).toFixed(1) : '0';

  const slis = {
    availability: {
      current: parseFloat(successRate.toFixed(3)),
      target: SLO_TARGETS.availability,
      met: successRate >= SLO_TARGETS.availability,
      unit: '%'
    },
    latency_p95: {
      current: p95,
      target: SLO_TARGETS.latency_p95,
      met: p95 <= SLO_TARGETS.latency_p95,
      unit: 'ms'
    },
    latency_p99: {
      current: p99,
      target: SLO_TARGETS.latency_p99,
      met: p99 <= SLO_TARGETS.latency_p99,
      unit: 'ms'
    }
  };

  const allMet = Object.values(slis).every(s => s.met);

  res.json({
    status: allMet ? 'within_budget' : 'budget_burning',
    window_minutes: windowMinutes,
    total_requests: totalRequests,
    total_errors: totalErrors,
    slis,
    error_budget: {
      total_allowed_errors: errorBudgetTotal,
      consumed: errorBudgetConsumed,
      remaining: errorBudgetRemaining,
      burn_percent: parseFloat(errorBudgetPercent),
      exhausted: errorBudgetRemaining <= 0
    },
    targets: SLO_TARGETS,
    evaluated_at: new Date().toISOString()
  });
});

module.exports = router;
