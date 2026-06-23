const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getAccount, updateBalance, addTransaction, getPayees, writeAudit } = require('../data/store');
const { checkFraud } = require('../services/fraud');
const { createLedgerEntry } = require('../services/ledger');
const { sendNotification } = require('../services/notification');
const { logger } = require('../observability/logger');
const { metrics } = require('../observability/metrics');

const router = Router();

router.post('/transfer', authMiddleware, async (req, res, next) => {
  try {
    const { payeeId, amount, reference } = req.body;

    if (!payeeId || !amount) {
      return res.status(400).json({ error: 'Validation error', message: 'payeeId and amount are required' });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Validation error', message: 'Amount must be a positive number' });
    }
    if (amount > 25000) {
      return res.status(400).json({ error: 'Validation error', message: 'Transfer limit is £25,000' });
    }

    const account = await getAccount(req.userId);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    if (account.status === 'restricted') {
      logger.error('payment-service', 'POST /api/transfer', 'Transfer blocked — account restricted', { user_id: req.userId, reason: 'fraud_review' });
      await writeAudit({ serviceName: 'payment-service', action: 'transfer_blocked', severity: 'ERROR', message: 'Account restricted', correlationId: req.correlationId, userId: req.userId });
      return res.status(403).json({ error: 'Account restricted', message: 'Your account is under review. Transfers are temporarily disabled.' });
    }

    const payees = await getPayees(req.userId);
    const payee = payees.find(p => p.id === payeeId);
    if (!payee) return res.status(404).json({ error: 'Payee not found' });

    const balance = parseFloat(account.balance);
    if (balance < amount) {
      logger.warn('payment-service', 'POST /api/transfer', 'Insufficient funds', { user_id: req.userId, amount, balance });
      metrics.recordFailedTransfer();
      await writeAudit({ serviceName: 'payment-service', action: 'transfer_failed', severity: 'WARN', message: `Insufficient funds: £${balance} < £${amount}`, correlationId: req.correlationId, userId: req.userId });
      return res.status(422).json({ error: 'Insufficient funds', message: `Available balance: £${balance.toFixed(2)}` });
    }

    // Step 1: Fraud check
    let fraudResult;
    try {
      fraudResult = await checkFraud({ fromAccount: account.id, toAccount: payeeId, amount, userId: req.userId, correlationId: req.correlationId });
    } catch (err) {
      metrics.recordFailedTransfer();
      await writeAudit({ serviceName: 'fraud-service', action: 'fraud_check_failed', severity: 'ERROR', message: err.message, correlationId: req.correlationId, userId: req.userId });
      return res.status(503).json({ error: 'Service unavailable', message: 'Fraud check service unavailable. Please try again.' });
    }

    if (fraudResult.flagged) {
      metrics.recordFailedTransfer();
      await writeAudit({ serviceName: 'fraud-service', action: 'transfer_flagged', severity: 'WARN', message: `Transfer flagged: £${amount} risk=${fraudResult.riskScore}`, correlationId: req.correlationId, userId: req.userId });
      return res.status(422).json({ error: 'Transfer flagged', message: 'This transfer has been flagged for review. It may take up to 24 hours to process.' });
    }

    // Step 2: Execute transfer
    await updateBalance(account.id, balance - amount);
    const tx = await addTransaction({
      fromAccount: account.id, amount, status: 'SUCCESS',
      reference: reference || '', description: `Transfer to ${payee.name}`, category: 'transfers', type: 'debit'
    });

    // Step 3: Ledger entry
    try {
      await createLedgerEntry({ transactionId: tx.id, fromAccount: account.id, toAccount: payeeId, amount, correlationId: req.correlationId });
    } catch (err) {
      // Ledger failure — transaction went through but ledger failed (inconsistency!)
      logger.error('ledger-service', 'POST /api/transfer', 'Ledger write failed — transaction inconsistency', { correlation_id: req.correlationId, transaction_id: tx.id });
      await writeAudit({ serviceName: 'ledger-service', action: 'ledger_write_failed', severity: 'CRITICAL', message: `Ledger failed for txn ${tx.id}`, correlationId: req.correlationId, userId: req.userId, metadata: { transactionId: tx.id, amount } });
    }

    // Step 4: Notification (non-blocking)
    sendNotification({ userId: req.userId, type: 'transfer_sent', message: `£${amount} sent to ${payee.name}`, correlationId: req.correlationId });

    metrics.recordTransfer();
    await writeAudit({ serviceName: 'payment-service', action: 'transfer_success', severity: 'INFO', message: `Transfer £${amount} to ${payee.name}`, correlationId: req.correlationId, userId: req.userId, metadata: { amount, payee: payee.name, transactionId: tx.id } });

    const updatedAccount = await getAccount(req.userId);
    res.status(201).json({ transaction: tx, newBalance: parseFloat(updatedAccount.balance) });
  } catch (err) { next(err); }
});

module.exports = router;
