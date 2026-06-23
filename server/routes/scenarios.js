const { Router } = require('express');
const { failureInjector } = require('../observability/failure');
const { logger } = require('../observability/logger');
const { incidentManager } = require('../observability/incidents');

const router = Router();

// Active scenarios tracking
const activeScenarios = [];

const SCENARIOS = {
  'payment-degraded': {
    name: 'Payment service degraded',
    description: 'Payment service experiences high latency (2s) and 10% error rate for 60 seconds.',
    duration: 60000,
    hint: 'Look for payment-service logs with high response_time_ms. Check error rate in Grafana.',
    actions: [
      { service: 'payment-service', state: { state: 'degraded', latencyMs: 2000, errorRate: 0.1 } }
    ]
  },
  'auth-failing': {
    name: 'Authentication service failing',
    description: 'Auth service returns 500 errors 50% of the time for 45 seconds.',
    duration: 45000,
    hint: 'Search Splunk for severity=ERROR AND service_name=auth-service. Look at the status_code field.',
    actions: [
      { service: 'auth-service', state: { state: 'failing', latencyMs: 500, errorRate: 0.5 } }
    ]
  },
  'full-outage': {
    name: 'Complete service outage',
    description: 'All services go down (503) for 30 seconds. Simulates infrastructure failure.',
    duration: 30000,
    hint: 'All requests return 503. Check /health/ready — it should show not_ready. Look at minibank_service_healthy in Grafana.',
    actions: [
      { service: 'auth-service', state: { state: 'disabled', latencyMs: 0, errorRate: 1.0 } },
      { service: 'account-service', state: { state: 'disabled', latencyMs: 0, errorRate: 1.0 } },
      { service: 'payment-service', state: { state: 'disabled', latencyMs: 0, errorRate: 1.0 } },
      { service: 'transaction-service', state: { state: 'disabled', latencyMs: 0, errorRate: 1.0 } },
      { service: 'savings-service', state: { state: 'disabled', latencyMs: 0, errorRate: 1.0 } },
      { service: 'analytics-service', state: { state: 'disabled', latencyMs: 0, errorRate: 1.0 } }
    ]
  },
  'cascading-failure': {
    name: 'Cascading failure',
    description: 'Payment service fails, causing transaction service to degrade, then account service slows down. Spreads over 90 seconds.',
    duration: 90000,
    hint: 'Watch the timeline in Splunk — errors start in payment-service, then transaction-service degrades 30s later, then account-service 60s later. Correlation IDs link the requests.',
    actions: [
      { service: 'payment-service', state: { state: 'failing', latencyMs: 3000, errorRate: 0.6 }, delay: 0 },
      { service: 'transaction-service', state: { state: 'degraded', latencyMs: 1500, errorRate: 0.15 }, delay: 30000 },
      { service: 'account-service', state: { state: 'degraded', latencyMs: 1000, errorRate: 0.05 }, delay: 60000 }
    ]
  },
  'latency-spike': {
    name: 'Latency spike',
    description: 'All services experience 3x normal latency for 60 seconds. No errors, just slow.',
    duration: 60000,
    hint: 'No errors in logs — but response_time_ms is much higher than normal. Check p95 latency in Grafana. This is the hardest type of issue to spot.',
    actions: [
      { service: 'auth-service', state: { state: 'custom', latencyMs: 600, errorRate: 0 } },
      { service: 'account-service', state: { state: 'custom', latencyMs: 800, errorRate: 0 } },
      { service: 'payment-service', state: { state: 'custom', latencyMs: 1200, errorRate: 0 } },
      { service: 'transaction-service', state: { state: 'custom', latencyMs: 700, errorRate: 0 } },
      { service: 'savings-service', state: { state: 'custom', latencyMs: 500, errorRate: 0 } },
      { service: 'analytics-service', state: { state: 'custom', latencyMs: 400, errorRate: 0 } }
    ]
  },
  'savings-outage': {
    name: 'Savings service outage',
    description: 'Only the savings service goes offline. Other services remain healthy. Duration: 60 seconds.',
    duration: 60000,
    hint: 'Only savings-service has errors. Users can still log in and view transactions, but pot operations fail. Targeted investigation needed.',
    actions: [
      { service: 'savings-service', state: { state: 'disabled', latencyMs: 0, errorRate: 1.0 } }
    ]
  },
  'fraud-service-down': {
    name: 'Fraud API outage',
    description: 'Fraud detection service goes completely offline. All transfers are blocked.',
    duration: 60000,
    hint: 'Transfers fail with "Fraud service unavailable". Look for fraud-service errors. Note: this blocks ALL payments, not just suspicious ones.',
    actions: [
      { service: 'fraud-service', state: { state: 'disabled', latencyMs: 0, errorRate: 1.0 } }
    ]
  },
  'database-latency': {
    name: 'Slow database',
    description: 'Every database query is delayed by 3 seconds. All services affected equally.',
    duration: 60000,
    hint: 'All services show high latency in Grafana. Check minibank_database_query_duration_ms — it will be way above normal. The issue is at the DB layer, not the services.',
    actions: [
      { service: 'auth-service', state: { state: 'custom', latencyMs: 3000, errorRate: 0 } },
      { service: 'account-service', state: { state: 'custom', latencyMs: 3000, errorRate: 0 } },
      { service: 'payment-service', state: { state: 'custom', latencyMs: 3000, errorRate: 0 } },
      { service: 'transaction-service', state: { state: 'custom', latencyMs: 3000, errorRate: 0 } },
      { service: 'savings-service', state: { state: 'custom', latencyMs: 3000, errorRate: 0 } }
    ]
  },
  'payment-partial-failure': {
    name: 'Intermittent payment failures',
    description: '40% of transfer requests fail randomly for 60 seconds.',
    duration: 60000,
    hint: 'payment-service has ~40% error rate. Not all requests fail — this is intermittent. Look at minibank_failed_transfers_total counter increasing.',
    actions: [
      { service: 'payment-service', state: { state: 'custom', latencyMs: 200, errorRate: 0.4 } }
    ]
  }
};

// GET /scenarios — list available scenarios
router.get('/scenarios', (req, res) => {
  const list = Object.entries(SCENARIOS).map(([id, s]) => ({
    id,
    name: s.name,
    description: s.description,
    duration_seconds: s.duration / 1000,
    hint: s.hint
  }));

  res.json({
    scenarios: list,
    active: activeScenarios.filter(a => a.endsAt > Date.now()).map(a => ({
      id: a.id,
      name: a.name,
      started_at: a.startedAt,
      ends_at: new Date(a.endsAt).toISOString(),
      remaining_seconds: Math.ceil((a.endsAt - Date.now()) / 1000)
    }))
  });
});

// POST /scenarios/:id/trigger — trigger a scenario
router.post('/scenarios/:id/trigger', (req, res) => {
  const scenario = SCENARIOS[req.params.id];
  if (!scenario) {
    return res.status(404).json({ error: 'Scenario not found', available: Object.keys(SCENARIOS) });
  }

  // Check if already running
  const alreadyRunning = activeScenarios.find(a => a.id === req.params.id && a.endsAt > Date.now());
  if (alreadyRunning) {
    return res.status(409).json({
      error: 'Scenario already active',
      remaining_seconds: Math.ceil((alreadyRunning.endsAt - Date.now()) / 1000)
    });
  }

  logger.info('scenario-runner', `POST /scenarios/${req.params.id}/trigger`, `Scenario triggered: ${scenario.name}`, {
    scenario_id: req.params.id,
    duration_seconds: scenario.duration / 1000
  });

  // Create an incident ticket for this scenario
  const severityMap = { 'payment-degraded': 'P2', 'auth-failing': 'P1', 'full-outage': 'P1', 'cascading-failure': 'P1', 'latency-spike': 'P3', 'savings-outage': 'P2', 'fraud-service-down': 'P1', 'database-latency': 'P2', 'payment-partial-failure': 'P2' };
  const ticket = incidentManager.create({
    title: scenario.name,
    description: scenario.hint,
    severity: severityMap[req.params.id] || 'P2',
    scenarioId: req.params.id,
    clue: scenario.hint
  });
  // Store root cause (hidden until resolved)
  ticket.rootCause = scenario.description;

  // Apply actions (some may be delayed for cascading)
  const timeouts = [];
  scenario.actions.forEach(action => {
    const delay = action.delay || 0;
    const t = setTimeout(() => {
      failureInjector.setCustom(action.service, action.state);
      logger.warn('scenario-runner', `scenario/${req.params.id}`, `Injecting failure: ${action.service} → ${action.state.state}`, {
        scenario_id: req.params.id,
        service: action.service,
        injected_state: action.state.state,
        latency_ms: action.state.latencyMs,
        error_rate: action.state.errorRate
      });
    }, delay);
    timeouts.push(t);
  });

  // Schedule auto-recovery
  const recoveryTimeout = setTimeout(() => {
    failureInjector.reset();
    logger.info('scenario-runner', `scenario/${req.params.id}`, `Scenario ended: ${scenario.name} — all services recovered`, {
      scenario_id: req.params.id
    });
  }, scenario.duration);
  timeouts.push(recoveryTimeout);

  // Track active scenario
  const active = {
    id: req.params.id,
    name: scenario.name,
    startedAt: new Date().toISOString(),
    endsAt: Date.now() + scenario.duration,
    timeouts
  };
  activeScenarios.push(active);

  res.status(201).json({
    message: `Scenario "${scenario.name}" triggered`,
    scenario_id: req.params.id,
    incident_number: ticket.number,
    duration_seconds: scenario.duration / 1000,
    hint: scenario.hint,
    ends_at: new Date(active.endsAt).toISOString()
  });
});

// POST /scenarios/reset — immediately stop all scenarios and recover
router.post('/scenarios/reset', (req, res) => {
  // Clear all timeouts
  activeScenarios.forEach(a => {
    (a.timeouts || []).forEach(t => clearTimeout(t));
  });
  activeScenarios.length = 0;

  failureInjector.reset();
  logger.info('scenario-runner', 'POST /scenarios/reset', 'All scenarios cancelled — services recovered');

  res.json({ message: 'All scenarios cancelled. All services healthy.' });
});

module.exports = router;
