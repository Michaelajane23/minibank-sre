const { Router } = require('express');
const { failureInjector } = require('../observability/failure');
const { metrics } = require('../observability/metrics');

const router = Router();
const startTime = Date.now();

// GET /health — simple liveness probe
router.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: Math.floor((Date.now() - startTime) / 1000) });
});

// GET /health/ready — readiness probe (are services healthy?)
router.get('/health/ready', (req, res) => {
  const services = failureInjector.getStatus();
  const unhealthy = Object.entries(services).filter(([_, v]) => v.state === 'disabled');

  if (unhealthy.length > 0) {
    return res.status(503).json({
      status: 'not_ready',
      reason: `${unhealthy.length} service(s) disabled`,
      disabled: unhealthy.map(([name]) => name)
    });
  }

  res.json({ status: 'ready' });
});

// GET /health/detailed — full service-level status
router.get('/health/detailed', (req, res) => {
  const services = failureInjector.getStatus();
  const summary = metrics.getSummary(5);

  const serviceHealth = {};
  Object.entries(services).forEach(([name, config]) => {
    serviceHealth[name] = {
      state: config.state,
      healthy: config.state === 'healthy',
      latency_injection_ms: config.latencyMs,
      error_rate_injection: config.errorRate
    };
  });

  const overallHealthy = Object.values(services).every(s => s.state === 'healthy');

  res.json({
    status: overallHealthy ? 'healthy' : 'degraded',
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    services: serviceHealth,
    metrics_5m: summary,
    timestamp: new Date().toISOString()
  });
});

// GET /health/integrations — show which external integrations are configured
router.get('/health/integrations', (req, res) => {
  res.json({
    splunk: {
      configured: !!(process.env.SPLUNK_HEC_URL && process.env.SPLUNK_HEC_TOKEN),
      hec_url: process.env.SPLUNK_HEC_URL ? process.env.SPLUNK_HEC_URL.replace(/token.*/, '***') : null
    },
    grafana: {
      scrape_endpoint: '/metrics',
      remote_write_configured: !!(process.env.GRAFANA_REMOTE_WRITE_URL && process.env.GRAFANA_METRICS_TOKEN)
    },
    postman: {
      base_url: `${req.protocol}://${req.get('host')}`,
      health: '/health',
      metrics: '/metrics',
      api_prefix: '/api'
    }
  });
});

module.exports = router;
