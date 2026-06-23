const { Router } = require('express');
const router = Router();

const MISSIONS = [
  {
    id: 1,
    title: 'Customers cannot transfer money',
    difficulty: 'beginner',
    description: 'Multiple customers are reporting that their bank transfers are failing. Your job is to find out why.',
    scenario: 'payment-degraded',
    objectives: [
      'Check the health endpoint to see which service is affected',
      'Look at Grafana for the payment-service error rate',
      'Search Splunk for: severity=ERROR AND service_name="payment-service"',
      'Identify what type of error is occurring (latency or failures?)',
      'Check the SLO endpoint to see error budget impact'
    ],
    hints: [
      'Start with: curl http://localhost:3000/health/detailed',
      'In Splunk, try: service_name="payment-service" | stats avg(response_time_ms)',
      'Check if it\'s errors (500s) or just slowness (high response_time_ms)'
    ],
    successCriteria: 'You should be able to identify that payment-service is experiencing high latency and ~10% error rate'
  },
  {
    id: 2,
    title: 'Money disappeared after transfer',
    difficulty: 'intermediate',
    description: 'A customer reports they sent £500 but the recipient never received it. The money left their account. Investigate what happened.',
    scenario: null,
    objectives: [
      'Log in as sarah.johnson@minibank.io and check the transaction history',
      'Find FAILED transactions in the database or via API',
      'Search audit logs for severity=CRITICAL',
      'Look for ledger-service errors — this records financial transactions',
      'Determine if the ledger failed after the money was deducted'
    ],
    hints: [
      'Search Splunk: service_name="ledger-service" AND severity=ERROR',
      'Look at audit_logs table for action="ledger_write_failed"',
      'The issue is: money was deducted but ledger entry failed — this means the transaction record is incomplete'
    ],
    successCriteria: 'You should identify that the ledger-service failed, creating an inconsistency between the account balance and the transaction record'
  },
  {
    id: 3,
    title: 'Users cannot log in',
    difficulty: 'beginner',
    description: 'Customer support is overwhelmed with calls — nobody can log in to their accounts. Investigate immediately.',
    scenario: 'auth-failing',
    objectives: [
      'Check health endpoint — which service is down?',
      'Look at minibank_login_failures_total in /metrics',
      'Search Splunk for auth-service errors',
      'Determine the error rate (is it 100% or intermittent?)',
      'Check how many users are affected'
    ],
    hints: [
      'curl http://localhost:3000/health/detailed — look at auth-service',
      'Splunk: service_name="auth-service" severity=ERROR | stats count',
      'Check minibank_service_healthy{service="auth-service"} in Grafana'
    ],
    successCriteria: 'Identify that auth-service is returning 500 errors on ~50% of requests'
  },
  {
    id: 4,
    title: 'Everything is slow',
    difficulty: 'advanced',
    description: 'No errors are occurring, but the entire platform feels sluggish. All pages take 3+ seconds to load. Find the root cause.',
    scenario: 'database-latency',
    objectives: [
      'Check health endpoint — note that all services show latency injection',
      'Look at minibank_database_query_duration_ms in Grafana',
      'This is a LATENCY issue, not an ERROR issue — you won\'t find ERROR logs',
      'Compare response_time_ms across all services — are they all equally affected?',
      'If all services are equally slow, it\'s likely a shared dependency (database)'
    ],
    hints: [
      'No ERROR logs exist for this scenario — it\'s pure latency',
      'In Splunk: * | stats avg(response_time_ms) by service_name — all will be high',
      'When ALL services are equally degraded, think: what do they ALL share? (Answer: the database)'
    ],
    successCriteria: 'Identify that the issue is at the database layer — all services share the same DB, and DB query latency is the bottleneck'
  },
  {
    id: 5,
    title: 'Fraud service blocking all payments',
    difficulty: 'intermediate',
    description: 'Every single transfer is being rejected. Customers are furious. Transfers were working fine an hour ago.',
    scenario: 'fraud-service-down',
    objectives: [
      'Try a transfer — what error message do you get?',
      'Check health endpoint for fraud-service',
      'Look at the service dependency chain: transfer → fraud → ledger → notification',
      'Is it the payment-service that\'s broken, or a downstream dependency?',
      'Check minibank_failed_transfers_total — is it increasing rapidly?'
    ],
    hints: [
      'The error message says "Fraud service unavailable" — that tells you WHICH service',
      'payment-service itself is healthy — it\'s the fraud-service dependency that\'s down',
      'In real banks, if fraud detection is unavailable, ALL payments must be blocked (safety)'
    ],
    successCriteria: 'Identify that fraud-service is offline, and understand WHY this blocks all transfers (mandatory fraud check)'
  },
  {
    id: 6,
    title: 'Cascading failure investigation',
    difficulty: 'advanced',
    description: 'Multiple services are failing, but they didn\'t all fail at the same time. Something triggered a chain reaction. Find the root cause.',
    scenario: 'cascading-failure',
    objectives: [
      'Check which services are affected using /health/detailed',
      'Build a TIMELINE — which service failed FIRST?',
      'In Splunk: severity=ERROR | stats earliest(timestamp) by service_name',
      'Identify the cascade order',
      'The first service to fail is the root cause'
    ],
    hints: [
      'Cascading failures spread over time — look at timestamps',
      'The payment-service fails first → then transaction-service → then account-service',
      'In production, you always fix the ROOT CAUSE, not the symptoms'
    ],
    successCriteria: 'Identify payment-service as the root cause, and explain how failures cascaded to other services'
  },
  {
    id: 7,
    title: 'Investigate suspicious transactions',
    difficulty: 'intermediate',
    description: 'The compliance team has flagged unusual activity. Several high-value transactions triggered fraud alerts. Review the audit trail.',
    scenario: null,
    objectives: [
      'Query the audit_logs for severity=WARN and action=transfer_flagged',
      'Check which users are involved',
      'Look at the amounts — what threshold triggers flagging?',
      'Review the fraud service response in logs (look for riskScore)',
      'Determine if any transfers over £5000 were allowed through'
    ],
    hints: [
      'Transfers over £5000 are automatically flagged by the fraud service',
      'Search audit_logs: SELECT * FROM audit_logs WHERE action = \'transfer_flagged\'',
      'In Splunk: service_name="fraud-service" AND message="*flagged*"'
    ],
    successCriteria: 'Identify the £5000 threshold and understand how the fraud service risk scoring works'
  }
];

// GET /missions — list all missions
router.get('/missions', (req, res) => {
  const list = MISSIONS.map(m => ({
    id: m.id,
    title: m.title,
    difficulty: m.difficulty,
    description: m.description,
    scenario: m.scenario
  }));
  res.json({ missions: list });
});

// GET /missions/:id — get mission details
router.get('/missions/:id', (req, res) => {
  const mission = MISSIONS.find(m => m.id === parseInt(req.params.id));
  if (!mission) return res.status(404).json({ error: 'Mission not found' });
  res.json(mission);
});

// --- Authenticated mission progress endpoints (separate router for /api mounting) ---
const { authMiddleware } = require('../middleware/auth');
const { query } = require('../database/pool');

const missionsApiRouter = Router();

// POST /missions/:id/complete — mark a mission as completed
missionsApiRouter.post('/missions/:id/complete', authMiddleware, async (req, res, next) => {
  try {
    const missionId = parseInt(req.params.id);
    const mission = MISSIONS.find(m => m.id === missionId);
    if (!mission) return res.status(404).json({ error: 'Mission not found' });

    await query(
      'INSERT INTO mission_completions (user_id, mission_id) VALUES ($1, $2) ON CONFLICT (user_id, mission_id) DO NOTHING',
      [req.userId, missionId]
    );
    res.json({ completed: true, mission_id: missionId });
  } catch (err) { next(err); }
});

// GET /missions/progress — get completed mission IDs for current user
missionsApiRouter.get('/missions/progress', authMiddleware, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT mission_id, completed_at FROM mission_completions WHERE user_id = $1 ORDER BY completed_at',
      [req.userId]
    );
    res.json({ completed: result.rows.map(r => ({ mission_id: r.mission_id, completed_at: r.completed_at })) });
  } catch (err) { next(err); }
});

module.exports = { missionsRoutes: router, missionsApiRoutes: missionsApiRouter };
