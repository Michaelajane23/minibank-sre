const { v4: uuidv4 } = require('uuid');
const { logger } = require('../observability/logger');
const { metrics } = require('../observability/metrics');
const { failureInjector } = require('../observability/failure');

function requestMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const startTime = Date.now();

  req.correlationId = correlationId;
  req.startTime = startTime;
  res.setHeader('X-Correlation-ID', correlationId);

  const service = resolveService(req.path);
  req.serviceName = service;

  // Failure injection
  const injection = failureInjector.check(service);
  if (injection.delay > 0) {
    setTimeout(() => processRequest(req, res, next, injection), injection.delay);
  } else {
    processRequest(req, res, next, injection);
  }
}

function processRequest(req, res, next, injection) {
  if (injection.shouldFail) {
    const status = injection.status || 500;
    logger.log({
      timestamp: new Date().toISOString(),
      correlation_id: req.correlationId,
      service_name: req.serviceName,
      endpoint: `${req.method} ${req.path}`,
      status_code: status,
      response_time_ms: Date.now() - req.startTime,
      severity: 'ERROR',
      message: 'Injected failure',
      user_id: req.userId || null,
      user_email: req.userEmail || null
    });
    metrics.record(req.serviceName, status, Date.now() - req.startTime);
    return res.status(status).json({ error: 'Service unavailable', correlation_id: req.correlationId });
  }

  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    logger.log({
      timestamp: new Date().toISOString(),
      correlation_id: req.correlationId,
      service_name: req.serviceName,
      endpoint: `${req.method} ${req.path}`,
      status_code: res.statusCode,
      response_time_ms: duration,
      severity: res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO',
      user_id: req.userId || null,
      user_email: req.userEmail || null
    });
    metrics.record(req.serviceName, res.statusCode, duration);
  });

  next();
}

function resolveService(path) {
  if (path.includes('/login') || path.includes('/signup') || path.includes('/logout')) return 'auth-service';
  if (path.includes('/account')) return 'account-service';
  if (path.includes('/transfer')) return 'payment-service';
  if (path.includes('/transactions')) return 'transaction-service';
  if (path.includes('/payees')) return 'payment-service';
  if (path.includes('/pots')) return 'savings-service';
  if (path.includes('/card')) return 'account-service';
  if (path.includes('/analytics')) return 'analytics-service';
  if (path.includes('/profile')) return 'account-service';
  if (path.includes('/webhooks')) return 'notification-service';
  // Fallback: 'unknown' in logs indicates a route that hasn't been mapped to a service.
  // If you see this in Splunk, it means a new endpoint was added without updating resolveService().
  return 'unknown';
}

module.exports = { requestMiddleware };
