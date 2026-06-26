const { register, Gauge, Counter } = require('prom-client');
const { metrics } = require('./metrics');
const { failureInjector } = require('./failure');
const https = require('https');

const PUSH_INTERVAL = 15000;

// Define metrics on the default prom-client registry
const errorRate = new Gauge({ name: 'minibank_error_rate_percent', help: 'Error rate 5m window' });
const requestRate = new Gauge({ name: 'minibank_request_rate_5m', help: 'Requests in 5m window' });
const transfers = new Gauge({ name: 'minibank_transfers_total', help: 'Total transfers' });
const failedTransfers = new Gauge({ name: 'minibank_failed_transfers_total', help: 'Failed transfers' });
const loginFailures = new Gauge({ name: 'minibank_login_failures_total', help: 'Login failures' });
const cardFreezes = new Gauge({ name: 'minibank_card_freezes_total', help: 'Card freezes' });
const dbErrors = new Gauge({ name: 'minibank_database_connection_errors_total', help: 'DB errors' });
const serviceHealthy = new Gauge({ name: 'minibank_service_healthy', help: 'Service health', labelNames: ['service'] });

async function pushMetrics() {
  const remoteWriteUrl = process.env.GRAFANA_REMOTE_WRITE_URL;
  const metricsUser = process.env.GRAFANA_METRICS_USER;
  const metricsToken = process.env.GRAFANA_METRICS_TOKEN;

  if (!remoteWriteUrl || !metricsUser || !metricsToken) return;

  const summary = metrics.getSummary(5);
  const counters = metrics.getCounters();
  const status = failureInjector.getStatus();

  errorRate.set(parseFloat(summary.errorRate));
  requestRate.set(summary.requests);
  transfers.set(counters.transfers);
  failedTransfers.set(counters.failedTransfers);
  loginFailures.set(counters.loginFailures);
  cardFreezes.set(counters.cardFreezes);
  dbErrors.set(counters.dbErrors);

  Object.entries(status).forEach(([svc, config]) => {
    serviceHealthy.labels(svc).set(config.state === 'healthy' ? 1 : 0);
  });

  const payload = await register.metrics();
  const base64creds = Buffer.from(`${metricsUser}:${metricsToken}`).toString('base64');
  const url = new URL(remoteWriteUrl);

  const options = {
    hostname: url.hostname,
    port: 443,
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

function startGrafanaPush() {
  const remoteWriteUrl = process.env.GRAFANA_REMOTE_WRITE_URL;
  const metricsUser = process.env.GRAFANA_METRICS_USER;
  const metricsToken = process.env.GRAFANA_METRICS_TOKEN;

  console.log('[grafana-push] startGrafanaPush called, URL:', remoteWriteUrl ? 'SET' : 'NOT SET');

  if (!remoteWriteUrl || !metricsUser || !metricsToken) return;

  process.stdout.write(JSON.stringify({
    timestamp: new Date().toISOString(),
    service_name: 'grafana-push',
    severity: 'INFO',
    message: `Grafana remote write enabled → pushing every ${PUSH_INTERVAL / 1000}s`
  }) + '\n');

  setInterval(() => pushMetrics().catch(() => {}), PUSH_INTERVAL);
}

module.exports = { startGrafanaPush };
