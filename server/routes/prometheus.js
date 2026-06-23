const { Router } = require('express');
const { metrics } = require('../observability/metrics');
const { failureInjector } = require('../observability/failure');
const { getPoolStats } = require('../database/pool');

const router = Router();
const startTime = Date.now();

router.get('/metrics', (req, res) => {
  const now = Date.now();
  const data = metrics.data || [];
  const counters = metrics.getCounters();
  const dbStats = metrics.getDbStats();
  const summary = metrics.getSummary(5);

  let poolStats = { totalCount: 0, idleCount: 0, waitingCount: 0 };
  try { poolStats = getPoolStats(); } catch(e) {}

  // Per-service breakdown
  const serviceCounts = {};
  const serviceErrors = {};
  const serviceLatencies = {};
  data.forEach(d => {
    if (!serviceCounts[d.service]) { serviceCounts[d.service] = 0; serviceErrors[d.service] = 0; serviceLatencies[d.service] = []; }
    serviceCounts[d.service]++;
    if (d.statusCode >= 500) serviceErrors[d.service]++;
    serviceLatencies[d.service].push(d.responseTimeMs);
  });

  let output = '';

  // Uptime
  output += '# HELP minibank_uptime_seconds Server uptime\n# TYPE minibank_uptime_seconds gauge\n';
  output += `minibank_uptime_seconds ${Math.floor((now - startTime) / 1000)}\n\n`;

  // API metrics
  output += '# HELP minibank_http_requests_total Total HTTP requests\n# TYPE minibank_http_requests_total counter\n';
  Object.entries(serviceCounts).forEach(([svc, count]) => { output += `minibank_http_requests_total{service="${svc}"} ${count}\n`; });
  output += '\n# HELP minibank_http_errors_total Total HTTP 5xx errors\n# TYPE minibank_http_errors_total counter\n';
  Object.entries(serviceErrors).forEach(([svc, count]) => { output += `minibank_http_errors_total{service="${svc}"} ${count}\n`; });

  output += '\n# HELP minibank_http_response_time_ms Response latency\n# TYPE minibank_http_response_time_ms summary\n';
  Object.entries(serviceLatencies).forEach(([svc, lats]) => {
    if (lats.length === 0) return;
    const sorted = [...lats].sort((a, b) => a - b);
    output += `minibank_http_response_time_ms{service="${svc}",quantile="0.5"} ${sorted[Math.ceil(0.5 * sorted.length) - 1] || 0}\n`;
    output += `minibank_http_response_time_ms{service="${svc}",quantile="0.95"} ${sorted[Math.ceil(0.95 * sorted.length) - 1] || 0}\n`;
    output += `minibank_http_response_time_ms{service="${svc}",quantile="0.99"} ${sorted[Math.ceil(0.99 * sorted.length) - 1] || 0}\n`;
  });

  // Banking metrics
  output += '\n# HELP minibank_transfers_total Successful transfers\n# TYPE minibank_transfers_total counter\n';
  output += `minibank_transfers_total ${counters.transfers}\n`;
  output += '# HELP minibank_failed_transfers_total Failed transfers\n# TYPE minibank_failed_transfers_total counter\n';
  output += `minibank_failed_transfers_total ${counters.failedTransfers}\n`;
  output += '# HELP minibank_login_failures_total Failed login attempts\n# TYPE minibank_login_failures_total counter\n';
  output += `minibank_login_failures_total ${counters.loginFailures}\n`;
  output += '# HELP minibank_active_users Currently active users\n# TYPE minibank_active_users gauge\n';
  output += `minibank_active_users ${metrics.activeUsers.size}\n`;
  output += '# HELP minibank_card_freezes_total Card freeze actions\n# TYPE minibank_card_freezes_total counter\n';
  output += `minibank_card_freezes_total ${counters.cardFreezes}\n`;

  // Service health
  output += '\n# HELP minibank_service_healthy Service health (1=healthy)\n# TYPE minibank_service_healthy gauge\n';
  const status = failureInjector.getStatus();
  Object.entries(status).forEach(([svc, config]) => { output += `minibank_service_healthy{service="${svc}"} ${config.state === 'healthy' ? 1 : 0}\n`; });

  output += '\n# HELP minibank_error_rate_percent Error rate (5m window)\n# TYPE minibank_error_rate_percent gauge\n';
  output += `minibank_error_rate_percent ${summary.errorRate}\n`;
  output += '# HELP minibank_request_rate_5m Requests in 5 minutes\n# TYPE minibank_request_rate_5m gauge\n';
  output += `minibank_request_rate_5m ${summary.requests}\n`;

  // Database metrics
  output += '\n# HELP minibank_database_query_duration_ms DB query latency\n# TYPE minibank_database_query_duration_ms gauge\n';
  output += `minibank_database_query_duration_ms{quantile="avg"} ${dbStats.avgDuration}\n`;
  output += `minibank_database_query_duration_ms{quantile="0.95"} ${dbStats.p95Duration}\n`;
  output += '# HELP minibank_database_connection_errors_total DB connection errors\n# TYPE minibank_database_connection_errors_total counter\n';
  output += `minibank_database_connection_errors_total ${counters.dbErrors}\n`;
  output += '# HELP minibank_database_active_connections Active DB connections\n# TYPE minibank_database_active_connections gauge\n';
  output += `minibank_database_active_connections ${poolStats.totalCount - poolStats.idleCount}\n`;

  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(output);
});

module.exports = router;
