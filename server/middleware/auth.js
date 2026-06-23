const jwt = require('jsonwebtoken');
const { logger } = require('../observability/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'minibank-secret-key-change-in-production';

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    logger.log({
      timestamp: new Date().toISOString(),
      correlation_id: req.correlationId,
      service_name: 'auth-service',
      endpoint: `${req.method} ${req.path}`,
      severity: 'WARN',
      message: 'Missing authorization header'
    });
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing authorization header' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    req.userEmail = payload.email;
    next();
  } catch(e) {
    logger.log({
      timestamp: new Date().toISOString(),
      correlation_id: req.correlationId,
      service_name: 'auth-service',
      endpoint: `${req.method} ${req.path}`,
      severity: 'WARN',
      message: 'Invalid or expired token',
      user_id: null
    });
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
