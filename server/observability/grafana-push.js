const { metrics } = require('./metrics');
const { failureInjector } = require('./failure');
const https = require('https');

const PUSH_INTERVAL = 15000;

function buildMetricLines() {
  const summary = metrics.getSummary(5);
  const counters = metrics.getCounters();
  const status = failureInjector.getStatus();
  const timestamp = Math.floor(Date.now() / 1000);

  const lines = [
    `minibank.error_rate_percent ${summary.errorRate} ${timestamp}`,
    `minibank.request_rate_5m ${summary.requests} ${timestamp}`,
    `minibank.transfers_total ${counters.transfers} ${timestamp}`,
    `minibank.failed_transfers_total ${counters.failedTransfers} ${timestamp}`,
    `minibank.login_failures_total ${counters.loginFailures} ${timestamp}`,
    `minibank.card_freezes_total ${counters.cardFreezes} ${timestamp}`,
    `minibank.database_connection_errors_total ${counters.dbErrors} ${timestamp}`
  ];

  Object.entries(status).forEach(([svc, config]) => {
    const safeName = svc.replace(/-/g, '_');
    lines.push(`minibank.service_healthy.${safeName} ${config.state === 'healthy' ? 1 : 0} ${timestamp}`);
  });

  return lines.join('\n') + '\n';
}

function pushMetrics() {
  const graphiteUrl = process.env.GRAFANA_GRAPHITE_URL;
  const metricsUser = process.env.GRAFANA_METRICS_USER;
  const metricsToken = process.env.GRAFANA_METRICS_TOKEN;

  if (!graphiteUrl || !metricsUser || !metricsToken) return;

  const payload = buildMetricLines();
  const url = new URL(graphiteUrl);
  const base64creds = Buffer.from(`${metricsUser}:${metricsToken}`).toString('base64');

  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: 'POST',
    rejectUnauthorized: false,
    headers: {
      'Authorization': `Basic ${base64creds}`,
      'Content-Type': 'text/plain',
      'Content-Length': Buffer.byteLength(payload, 'utf8')
    }
  };

  const req = https.request(options, (res) => {
    res.resume();
    if (res.statusCode !== 200 && res.statusCode !== 204) {
      process.stderr.write(`[grafana-push] Non-200 response: ${res.statusCode}\n`);
    }
  });

  req.on('error', () => {});
  req.write(payload, 'utf8');
  req.end();
}

function startGrafanaPush() {
  const graphiteUrl = process.env.GRAFANA_GRAPHITE_URL;
  const metricsUser = process.env.GRAFANA_METRICS_USER;
  const metricsToken = process.env.GRAFANA_METRICS_TOKEN;

  console.log('[grafana-push] startGrafanaPush called, URL:', graphiteUrl ? 'SET' : 'NOT SET');

  if (!graphiteUrl || !metricsUser || !metricsToken) {
    console.log('[grafana-push] Skipping — env vars not set. URL:', graphiteUrl ? 'SET' : 'NOT SET');
    return;
  }

  process.stdout.write(JSON.stringify({
    timestamp: new Date().toISOString(),
    service_name: 'grafana-push',
    severity: 'INFO',
    message: `Grafana Graphite push enabled → ${graphiteUrl} every ${PUSH_INTERVAL / 1000}s`
  }) + '\n');

  setInterval(() => {
    try { pushMetrics(); } catch (e) {}
  }, PUSH_INTERVAL);
}

module.exports = { startGrafanaPush };
