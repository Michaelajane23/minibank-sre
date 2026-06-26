const { metrics } = require('./metrics');
const { failureInjector } = require('./failure');
const https = require('https');

const PUSH_INTERVAL = 15000;

function buildMetricPayload() {
  const summary = metrics.getSummary(5);
  const counters = metrics.getCounters();
  const status = failureInjector.getStatus();
  const now = Math.floor(Date.now() / 1000);
  const interval = 15;

  const metricList = [
    { name: 'minibank.error_rate_percent', value: parseFloat(summary.errorRate) || 0, interval, time: now },
    { name: 'minibank.request_rate_5m', value: summary.requests || 0, interval, time: now },
    { name: 'minibank.transfers_total', value: counters.transfers || 0, interval, time: now },
    { name: 'minibank.failed_transfers_total', value: counters.failedTransfers || 0, interval, time: now },
    { name: 'minibank.login_failures_total', value: counters.loginFailures || 0, interval, time: now },
    { name: 'minibank.card_freezes_total', value: counters.cardFreezes || 0, interval, time: now },
    { name: 'minibank.database_connection_errors_total', value: counters.dbErrors || 0, interval, time: now }
  ];

  Object.entries(status).forEach(([svc, config]) => {
    const safeName = svc.replace(/-/g, '_');
    metricList.push({
      name: `minibank.service_healthy.${safeName}`,
      value: config.state === 'healthy' ? 1 : 0,
      interval,
      time: now
    });
  });

  return JSON.stringify(metricList);
}

function pushMetrics() {
  const graphiteUrl = process.env.GRAFANA_GRAPHITE_URL;
  const metricsUser = process.env.GRAFANA_METRICS_USER;
  const metricsToken = process.env.GRAFANA_METRICS_TOKEN;

  if (!graphiteUrl || !metricsUser || !metricsToken) return;

  const payload = buildMetricPayload();
  const url = new URL(graphiteUrl);

  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: 'POST',
    rejectUnauthorized: false,
    headers: {
      'Authorization': `Bearer ${metricsUser}:${metricsToken}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload, 'utf8')
    }
  };

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      if (res.statusCode !== 200 && res.statusCode !== 204) {
        process.stderr.write(`[grafana-push] Non-200 response: ${res.statusCode} — ${body}\n`);
      }
    });
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
