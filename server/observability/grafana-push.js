// Optional Prometheus Remote Write to Grafana Cloud
// Pushes metrics every 15 seconds if GRAFANA_REMOTE_WRITE_URL is configured.
// This is a fallback — Grafana Cloud can also scrape GET /metrics directly.
//
// Required env vars:
//   GRAFANA_REMOTE_WRITE_URL  — e.g. https://prometheus-prod-01-eu-west-0.grafana.net/api/prom/push
//   GRAFANA_METRICS_USER      — numeric user ID from Grafana Cloud
//   GRAFANA_METRICS_TOKEN     — API token with MetricsPublisher role

const https = require('https');
const { metrics } = require('./metrics');
const { failureInjector } = require('./failure');

const REMOTE_WRITE_URL = process.env.GRAFANA_REMOTE_WRITE_URL || null;
const METRICS_USER = process.env.GRAFANA_METRICS_USER || null;
const METRICS_TOKEN = process.env.GRAFANA_METRICS_TOKEN || null;
const PUSH_INTERVAL = 15000; // 15 seconds

function startGrafanaPush() {
  if (!REMOTE_WRITE_URL || !METRICS_USER || !METRICS_TOKEN) {
    return; // Not configured — Grafana will scrape /metrics instead
  }

  process.stdout.write(JSON.stringify({
    timestamp: new Date().toISOString(),
    service_name: 'grafana-push',
    severity: 'INFO',
    message: `Grafana remote write enabled → pushing every ${PUSH_INTERVAL / 1000}s`
  }) + '\n');

  setInterval(() => pushMetrics(), PUSH_INTERVAL);
}

function pushMetrics() {
  const summary = metrics.getSummary(5);
  const counters = metrics.getCounters();
  const status = failureInjector.getStatus();

  // Prometheus text exposition format (no timestamps — server uses receive time)
  const lines = [
    `# TYPE minibank_error_rate_percent gauge`,
    `minibank_error_rate_percent ${summary.errorRate}`,
    `# TYPE minibank_request_rate_5m gauge`,
    `minibank_request_rate_5m ${summary.requests}`,
    `# TYPE minibank_transfers_total counter`,
    `minibank_transfers_total ${counters.transfers}`,
    `# TYPE minibank_failed_transfers_total counter`,
    `minibank_failed_transfers_total ${counters.failedTransfers}`,
    `# TYPE minibank_login_failures_total counter`,
    `minibank_login_failures_total ${counters.loginFailures}`,
    `# TYPE minibank_card_freezes_total counter`,
    `minibank_card_freezes_total ${counters.cardFreezes}`,
    `# TYPE minibank_database_connection_errors_total counter`,
    `minibank_database_connection_errors_total ${counters.dbErrors}`,
    `# TYPE minibank_service_healthy gauge`
  ];

  Object.entries(status).forEach(([svc, config]) => {
    lines.push(`minibank_service_healthy{service="${svc}"} ${config.state === 'healthy' ? 1 : 0}`);
  });

  const payload = lines.join('\n') + '\n';
  const url = new URL(REMOTE_WRITE_URL);
  const base64creds = Buffer.from(`${METRICS_USER}:${METRICS_TOKEN}`).toString('base64');

  const options = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Authorization': `Basic ${base64creds}`,
      'Content-Type': 'text/plain',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = https.request(options, (res) => {
    res.resume();
    if (res.statusCode !== 200 && res.statusCode !== 204) {
      process.stderr.write(`[grafana-push] Non-200 response: ${res.statusCode}\n`);
    }
  });

  req.on('error', () => {});
  req.write(payload);
  req.end();
}

module.exports = { startGrafanaPush };
