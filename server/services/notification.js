// Simulated notification service — sends payment confirmations
const { logger } = require('../observability/logger');
const { failureInjector } = require('../observability/failure');
const { metrics } = require('../observability/metrics');

async function sendNotification({ userId, type, message, correlationId }) {
  const start = Date.now();
  const service = 'notification-service';

  const injection = failureInjector.check(service);
  if (injection.delay > 0) {
    await new Promise(r => setTimeout(r, injection.delay));
  }
  if (injection.shouldFail) {
    const duration = Date.now() - start;
    metrics.record(service, 503, duration);
    logger.warn(service, 'POST /notifications/send', 'Notification service unavailable (non-critical)', { correlation_id: correlationId, duration_ms: duration });
    // Notifications are non-critical — we don't throw, just log
    return { sent: false, reason: 'service_unavailable' };
  }

  // Simulate send time (5-20ms)
  await new Promise(r => setTimeout(r, 5 + Math.random() * 15));

  const duration = Date.now() - start;
  metrics.record(service, 200, duration);

  logger.info(service, 'POST /notifications/send', `Notification sent: ${type}`, {
    correlation_id: correlationId,
    user_id: userId,
    type,
    duration_ms: duration
  });

  return { sent: true };
}

module.exports = { sendNotification };
