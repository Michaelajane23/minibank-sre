const { logger } = require('../observability/logger');

function errorHandler(err, req, res, _next) {
  const status = err.statusCode || 500;
  const message = err.expose ? err.message : 'Internal server error';

  logger.log({
    timestamp: new Date().toISOString(),
    correlation_id: req.correlationId || 'unknown',
    service_name: req.serviceName || 'unknown',
    endpoint: `${req.method} ${req.path}`,
    status_code: status,
    response_time_ms: Date.now() - (req.startTime || Date.now()),
    severity: 'ERROR',
    error: err.message,
    user_id: req.userId || null
  });

  res.status(status).json({ error: message, correlation_id: req.correlationId });
}

module.exports = { errorHandler };
