// Background customer activity simulator
// Generates realistic synthetic banking activity so Splunk logs show
// meaningful customer behaviour patterns throughout the day.

const { v4: uuidv4 } = require('uuid');
const { logger } = require('./logger');
const { failureInjector } = require('./failure');
const { query } = require('../database/pool');
const { addTransaction } = require('../data/store');

let users = []; // { id, accountId }

const TRANSFER_DESCRIPTIONS = [
  'Coffee shop', 'Lunch', 'Online shopping', 'Subscription',
  'Cinema tickets', 'Takeaway', 'Transport', 'Gym membership'
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max) { return parseFloat((Math.random() * (max - min) + min).toFixed(2)); }

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
  logger.log({
    timestamp: new Date().toISOString(),
    correlation_id: uuidv4(),
    service_name: 'activity-simulator',
    endpoint: 'POST /api/login',
    severity: 'INFO',
    message: 'Simulated customer login',
    user_id: user.id,
    status_code: 200,
    response_time_ms: rand(5, 25)
  });
}

function simulateBalanceCheck() {
  const user = pick(users);
  logger.log({
    timestamp: new Date().toISOString(),
    correlation_id: uuidv4(),
    service_name: 'account-service',
    endpoint: 'GET /account',
    severity: 'INFO',
    message: 'Account balance checked',
    user_id: user.id,
    status_code: 200,
    response_time_ms: rand(2, 8)
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

  // Check if payment-service is healthy
  const status = failureInjector.getStatus();
  const paymentHealthy = status['payment-service']?.state === 'healthy';

  if (!paymentHealthy) {
    logger.log({
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      service_name: 'payment-service',
      endpoint: 'POST /api/transfer',
      severity: 'ERROR',
      message: 'Simulated transfer failed — payment service degraded',
      user_id: from.id,
      amount,
      status_code: 503,
      response_time_ms: rand(2000, 5000)
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
    // DB might not be available — silently skip
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
  // Only fire when no chaos is active
  const status = failureInjector.getStatus();
  const allHealthy = Object.values(status).every(s => s.state === 'healthy');
  if (!allHealthy) return;

  const user = pick(users);
  const services = ['payment-service', 'account-service', 'transaction-service'];
  const endpoints = ['GET /account', 'GET /transactions', 'POST /api/transfer'];

  logger.log({
    timestamp: new Date().toISOString(),
    correlation_id: uuidv4(),
    service_name: pick(services),
    endpoint: pick(endpoints),
    severity: 'INFO',
    message: 'Request completed with elevated latency',
    user_id: user.id,
    status_code: 200,
    response_time_ms: rand(800, 2000)
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
    status_code: 200,
    response_time_ms: rand(10, 30)
  });
}

// ─── Start ───

async function startActivitySimulator() {
  try {
    const result = await query(
      'SELECT u.id, a.id as account_id FROM users u JOIN accounts a ON a.user_id = u.id'
    );
    users = result.rows.map(r => ({ id: r.id, accountId: r.account_id }));
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
  schedule(simulateSlowRequest, 90000, 240000);
  schedule(simulateCardFreeze, 180000, 400000);
}

module.exports = { startActivitySimulator };
