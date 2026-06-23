const { Router } = require('express');
const { logger } = require('../observability/logger');

const router = Router();

// Store received alerts (in-memory)
const receivedAlerts = [];
const MAX_ALERTS = 200;

// POST /webhooks/alerts — receives alert payloads from Grafana/external alerting
router.post('/webhooks/alerts', (req, res) => {
  const alert = {
    id: `alert_${Date.now()}`,
    received_at: new Date().toISOString(),
    source: req.headers['user-agent'] || 'unknown',
    payload: req.body
  };

  receivedAlerts.push(alert);
  if (receivedAlerts.length > MAX_ALERTS) receivedAlerts.shift();

  logger.info('webhook-receiver', 'POST /webhooks/alerts', 'Alert received', {
    alert_id: alert.id,
    source: alert.source,
    title: req.body?.title || req.body?.alerts?.[0]?.labels?.alertname || 'unknown'
  });

  res.status(202).json({ received: true, alert_id: alert.id });
});

// GET /webhooks/alerts — view received alerts
router.get('/webhooks/alerts', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, MAX_ALERTS);
  res.json({
    alerts: receivedAlerts.slice(-limit).reverse(),
    total: receivedAlerts.length
  });
});

// DELETE /webhooks/alerts — clear all received alerts
router.delete('/webhooks/alerts', (req, res) => {
  receivedAlerts.length = 0;
  res.json({ message: 'All received alerts cleared' });
});

module.exports = router;
