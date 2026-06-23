// Simulated ledger service — records financial transactions immutably
const { logger } = require('../observability/logger');
const { failureInjector } = require('../observability/failure');
const { metrics } = require('../observability/metrics');

async function createLedgerEntry({ transactionId, fromAccount, toAccount, amount, correlationId }) {
  const start = Date.now();
  const service = 'ledger-service';

  const injection = failureInjector.check(service);
  if (injection.delay > 0) {
    await new Promise(r => setTimeout(r, injection.delay));
  }
  if (injection.shouldFail) {
    const duration = Date.now() - start;
    metrics.record(service, 503, duration);
    logger.error(service, 'POST /ledger/create', 'Ledger service unavailable', { correlation_id: correlationId, duration_ms: duration });
    throw new Error('Ledger service unavailable');
  }

  // Simulate write time (10-40ms)
  await new Promise(r => setTimeout(r, 10 + Math.random() * 30));

  const duration = Date.now() - start;
  metrics.record(service, 201, duration);

  logger.info(service, 'POST /ledger/create', 'Ledger entry created', {
    correlation_id: correlationId,
    transaction_id: transactionId,
    amount,
    duration_ms: duration
  });

  return { recorded: true, ledgerId: `ldg_${Date.now()}` };
}

module.exports = { createLedgerEntry };
