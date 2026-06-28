// Background customer activity simulator
// Generates realistic synthetic banking activity so Splunk logs show
// meaningful customer behaviour patterns throughout the day.

const { v4: uuidv4 } = require('uuid');
const { logger } = require('./logger');
const { failureInjector } = require('./failure');
const { query } = require('../database/pool');
const { addTransaction } = require('../data/store');

let users = []; // { id, email, accountId }

const TRANSFER_DESCRIPTIONS = [
  'Coffee shop', 'Lunch', 'Online shopping', 'Subscription',
  'Cinema tickets', 'Takeaway', 'Transport', 'Gym membership'
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max) { return parseFloat((Math.random() * (max - min) + min).toFixed(2)); }

function serviceHealthy(serviceName) {
  const status = failureInjector.getStatus();
  const svc = status[serviceName];
  return !svc || svc.state === 'healthy';
}

function serviceLatency(serviceName) {
  const status = failureInjector.getStatus();
  return status[serviceName]?.latencyMs || 0;
}

// Schedule a recurring activity with jitter
function schedule(fn, minMs, maxMs) {
  const delay = rand(minMs, maxMs);
  setTimeout(() => {
    fn();
    schedule(fn, minMs, maxMs);
  }, delay);
}

// ─── Activity Types ───

function simulateLogin() {
  const user = pick(users);
  const healthy = serviceHealthy('auth-service');
  const latency = serviceLatency('auth-service');

  logger.log({
    timestamp: new Date().toISOString(),
    correlation_id: uuidv4(),
    service_name: 'auth-service',
    endpoint: 'POST /api/login',
    severity: healthy ? 'INFO' : 'ERROR',
    message: healthy ? 'Simulated customer login'
      : 'Simulated login failed — auth service returning errors',
    user_id: user.id,
    user_email: user.email,
    status_code: healthy ? 200 : 500,
    response_time_ms: rand(5, 25) + latency
  });
}

function simulateBalanceCheck() {
  const user = pick(users);
  const healthy = serviceHealthy('account-service');
  const latency = serviceLatency('account-service');

  logger.log({
    timestamp: new Date().toISOString(),
    correlation_id: uuidv4(),
    service_name: 'account-service',
    endpoint: 'GET /account',
    severity: healthy ? 'INFO' : (latency > 500 ? 'WARN' : 'ERROR'),
    message: healthy ? 'Account balance checked'
      : latency > 1000 ? 'Account lookup slow — elevated latency detected'
      : 'Account lookup failed — service unavailable',
    user_id: user.id,
    user_email: user.email,
    status_code: healthy ? 200 : (latency > 0 && failureInjector.getStatus()['account-service']?.errorRate === 0 ? 200 : 500),
    response_time_ms: rand(2, 8) + latency
  });
}

async function simulateTransfer() {
  if (users.length < 2) return;
  const from = pick(users);
  let to = pick(users);
  while (to.id === from.id) { to = pick(users); }

  const amount = randFloat(1, 50);
  const description = pick(TRANSFER_DESCRIPTIONS);
  const correlationId = uuidv4();

  const paymentHealthy = serviceHealthy('payment-service');
  const fraudHealthy = serviceHealthy('fraud-service');

  if (!paymentHealthy || !fraudHealthy) {
    logger.log({
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      service_name: !fraudHealthy ? 'fraud-service' : 'payment-service',
      endpoint: 'POST /api/transfer',
      severity: 'ERROR',
      message: !fraudHealthy ? 'Simulated transfer blocked — fraud service unavailable'
        : 'Simulated transfer failed — payment service degraded',
      user_id: from.id,
      user_email: from.email,
      amount,
      status_code: 503,
      response_time_ms: rand(100, 500)
    });
    return;
  }

  try {
    await addTransaction({
      fromAccount: from.accountId,
      toAccount: to.accountId,
      amount,
      status: 'SUCCESS',
      reference: 'SIM-' + Date.now(),
      description,
      category: 'transfers',
      type: 'debit'
    });
  } catch (e) {
    return;
  }

  logger.log({
    timestamp: new Date().toISOString(),
    correlation_id: correlationId,
    service_name: 'payment-service',
    endpoint: 'POST /api/transfer',
    severity: 'INFO',
    message: 'Simulated transfer completed',
    user_id: from.id,
    user_email: from.email,
    amount,
    status_code: 201,
    response_time_ms: rand(80, 200)
  });
}

function simulateFailedLogin() {
  logger.log({
    timestamp: new Date().toISOString(),
    correlation_id: uuidv4(),
    service_name: 'auth-service',
    endpoint: 'POST /api/login',
    severity: 'WARN',
    message: 'Failed login — wrong password',
    email: `unknown_${rand(100, 999)}@example.com`,
    status_code: 401,
    response_time_ms: rand(3, 12)
  });
}

function simulateSlowRequest() {
  const status = failureInjector.getStatus();
  // Find services with elevated latency but no errors (the everything-slow pattern)
  const slowButHealthy = Object.entries(status)
    .filter(([_, cfg]) => cfg.latencyMs > 500 && cfg.errorRate === 0)
    .map(([name]) => name);

  // Only fire if there are services with elevated latency and no errors
  if (slowButHealthy.length === 0) return;

  const serviceName = pick(slowButHealthy);
  const latency = status[serviceName].latencyMs;
  const user = pick(users);

  logger.log({
    timestamp: new Date().toISOString(),
    correlation_id: uuidv4(),
    service_name: serviceName,
    endpoint: pick(['GET /account', 'GET /transactions', 'POST /api/transfer']),
    severity: 'WARN',
    message: `Elevated latency detected — ${serviceName} responding slowly`,
    user_id: user.id,
    user_email: user.email,
    status_code: 200,
    response_time_ms: rand(latency, latency + 500)
  });
}

function simulateCardFreeze() {
  const user = pick(users);
  logger.log({
    timestamp: new Date().toISOString(),
    correlation_id: uuidv4(),
    service_name: 'account-service',
    endpoint: 'POST /card/freeze',
    severity: 'INFO',
    message: 'Card freeze requested by customer',
    user_id: user.id,
    user_email: user.email,
    status_code: 200,
    response_time_ms: rand(10, 30)
  });
}

function simulateSavingsAccess() {
  const user = pick(users);
  const healthy = serviceHealthy('savings-service');

  logger.log({
    timestamp: new Date().toISOString(),
    correlation_id: uuidv4(),
    service_name: 'savings-service',
    endpoint: 'GET /pots',
    severity: healthy ? 'INFO' : 'ERROR',
    message: healthy ? 'Savings pots accessed'
      : 'Savings pots unavailable — service down',
    user_id: user.id,
    user_email: user.email,
    status_code: healthy ? 200 : 503,
    response_time_ms: healthy ? rand(3, 10) : rand(0, 5)
  });
}

function simulateTransactionHistory() {
  const user = pick(users);
  const healthy = serviceHealthy('transaction-service');
  const latency = serviceLatency('transaction-service');

  logger.log({
    timestamp: new Date().toISOString(),
    correlation_id: uuidv4(),
    service_name: 'transaction-service',
    endpoint: 'GET /transactions',
    severity: healthy ? 'INFO' : 'ERROR',
    message: healthy
      ? 'Transaction history loaded'
      : 'Transaction history failed — query timeout',
    user_id: user.id,
    user_email: user.email,
    status_code: healthy ? 200 : 500,
    response_time_ms: rand(5, 15) + latency
  });
}

// ─── Start ───

async function startActivitySimulator() {
  try {
    const result = await query(
      'SELECT u.id, u.email, a.id as account_id FROM users u JOIN accounts a ON a.user_id = u.id'
    );
    users = result.rows.map(r => ({ id: r.id, email: r.email, accountId: r.account_id }));
  } catch (e) {
    logger.log({
      timestamp: new Date().toISOString(),
      service_name: 'activity-simulator',
      severity: 'WARN',
      message: 'Activity simulator skipped — could not load users from database'
    });
    return;
  }

  if (users.length === 0) {
    logger.log({
      timestamp: new Date().toISOString(),
      service_name: 'activity-simulator',
      severity: 'WARN',
      message: 'Activity simulator skipped — no users found in database'
    });
    return;
  }

  logger.log({
    timestamp: new Date().toISOString(),
    service_name: 'activity-simulator',
    severity: 'INFO',
    message: `Activity simulator started — synthetic customer events enabled (${users.length} users loaded)`
  });

  // Start all activity loops with independent jittered intervals
  schedule(simulateLogin, 30000, 90000);
  schedule(simulateBalanceCheck, 15000, 45000);
  schedule(() => simulateTransfer().catch(() => {}), 15000, 45000);
  schedule(simulateFailedLogin, 120000, 300000);
  schedule(simulateSlowRequest, 10000, 30000);
  schedule(simulateCardFreeze, 180000, 400000);
  schedule(simulateSavingsAccess, 20000, 60000);
  schedule(simulateTransactionHistory, 20000, 60000);
}

module.exports = { startActivitySimulator };
