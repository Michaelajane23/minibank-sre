// Simulated fraud detection service
const { logger } = require('../observability/logger');
const { failureInjector } = require('../observability/failure');
const { metrics } = require('../observability/metrics');

async function checkFraud({ fromAccount, toAccount, amount, userId, correlationId }) {
  const start = Date.now();
  const service = 'fraud-service';

  // Check for failure injection
  const injection = failureInjector.check(service);
  if (injection.delay > 0) {
    await new Promise(r => setTimeout(r, injection.delay));
  }
  if (injection.shouldFail) {
    const duration = Date.now() - start;
    metrics.record(service, 503, duration);
    logger.error(service, 'POST /fraud/check', 'Fraud service unavailable', { correlation_id: correlationId, duration_ms: duration });
    throw new Error('Fraud service unavailable');
  }

  // Simulate processing time (20-80ms)
  await new Promise(r => setTimeout(r, 20 + Math.random() * 60));

  const duration = Date.now() - start;
  metrics.record(service, 200, duration);

  // Flag very large transfers
  const flagged = amount > 5000;

  logger.info(service, 'POST /fraud/check', flagged ? 'Transaction flagged for review' : 'Transaction cleared', {
    correlation_id: correlationId,
    user_id: userId,
    amount,
    flagged,
    duration_ms: duration
  });

  return { cleared: !flagged, flagged, riskScore: flagged ? 0.85 : Math.random() * 0.3 };
}

module.exports = { checkFraud };
