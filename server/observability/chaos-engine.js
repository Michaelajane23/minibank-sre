// Chaos Engine — automatically triggers random incidents at random intervals.
// Designed for a work experience student to investigate using Splunk/Grafana.
// Each incident generates a clear trail of structured logs they can follow.

const { failureInjector } = require('./failure');
const { logger } = require('./logger');

// Simpler scenarios for auto-triggering (shorter, less severe)
const CHAOS_SCENARIOS = [
  {
    id: 'slow-payments',
    name: 'Slow payment processing',
    severity: 'medium',
    clue: 'Payments are taking longer than usual to process',
    rootCause: 'payment-service experiencing high latency due to downstream timeout',
    inject: () => failureInjector.setCustom('payment-service', { latencyMs: 1500, errorRate: 0.05 }),
    duration: 45000
  },
  {
    id: 'login-errors',
    name: 'Login failures',
    severity: 'high',
    clue: 'Some users are unable to log in',
    rootCause: 'auth-service returning intermittent 500 errors — possible session store issue',
    inject: () => failureInjector.setCustom('auth-service', { latencyMs: 300, errorRate: 0.3 }),
    duration: 40000
  },
  {
    id: 'savings-down',
    name: 'Savings service unavailable',
    severity: 'medium',
    clue: 'Users cannot access their savings pots',
    rootCause: 'savings-service is completely unresponsive — process crash',
    inject: () => failureInjector.setCustom('savings-service', { latencyMs: 0, errorRate: 1.0 }),
    duration: 50000
  },
  {
    id: 'account-slow',
    name: 'Account lookups degraded',
    severity: 'low',
    clue: 'Dashboard is loading slowly for all users',
    rootCause: 'account-service has elevated latency — possible database connection pool exhaustion',
    inject: () => failureInjector.setCustom('account-service', { latencyMs: 2000, errorRate: 0 }),
    duration: 60000
  },
  {
    id: 'transaction-errors',
    name: 'Transaction history failures',
    severity: 'medium',
    clue: 'Transaction page showing errors for some users',
    rootCause: 'transaction-service returning 500s — query timeout on large accounts',
    inject: () => failureInjector.setCustom('transaction-service', { latencyMs: 800, errorRate: 0.25 }),
    duration: 35000
  },
  {
    id: 'everything-slow',
    name: 'Platform-wide slowness',
    severity: 'high',
    clue: 'Everything feels sluggish but nothing is actually failing',
    rootCause: 'Infrastructure-level issue — all services impacted equally. Likely network or host CPU.',
    inject: () => {
      failureInjector.setCustom('auth-service', { latencyMs: 1000, errorRate: 0 });
      failureInjector.setCustom('account-service', { latencyMs: 1200, errorRate: 0 });
      failureInjector.setCustom('payment-service', { latencyMs: 1500, errorRate: 0 });
      failureInjector.setCustom('transaction-service', { latencyMs: 900, errorRate: 0 });
      failureInjector.setCustom('savings-service', { latencyMs: 800, errorRate: 0 });
    },
    duration: 55000
  },
  {
    id: 'fraud-service-down',
    name: 'Fraud API outage',
    severity: 'high',
    clue: 'All bank transfers are being rejected',
    rootCause: 'fraud-service returning 503 — all transfers blocked because fraud check is mandatory',
    inject: () => failureInjector.setCustom('fraud-service', { latencyMs: 0, errorRate: 1.0 }),
    duration: 45000
  },
  {
    id: 'ledger-degraded',
    name: 'Ledger service degraded',
    severity: 'critical',
    clue: 'Transfers succeed but audit trail shows CRITICAL errors — money moved without ledger record',
    rootCause: 'ledger-service failing silently — transactions complete but financial records are inconsistent',
    inject: () => failureInjector.setCustom('ledger-service', { latencyMs: 3000, errorRate: 0.6 }),
    duration: 50000
  },
  {
    id: 'notification-down',
    name: 'Notification service outage',
    severity: 'low',
    clue: 'Users not receiving payment confirmations, but transfers still work',
    rootCause: 'notification-service is down — non-critical, transfers succeed but no user notifications sent',
    inject: () => failureInjector.setCustom('notification-service', { latencyMs: 0, errorRate: 1.0 }),
    duration: 60000
  },
  {
    id: 'partial-payment-failure',
    name: 'Intermittent payment failures',
    severity: 'medium',
    clue: 'About 40% of transfer attempts fail randomly — customers complaining',
    rootCause: 'payment-service has 40% error rate — possible upstream dependency flapping',
    inject: () => failureInjector.setCustom('payment-service', { latencyMs: 200, errorRate: 0.4 }),
    duration: 45000
  }
];

class ChaosEngine {
  constructor() {
    this.running = false;
    this.intervalId = null;
    this.recoveryTimeout = null;
    this.currentIncident = null;
    this.incidentHistory = [];
    this.config = {
      minIntervalMs: 3 * 60 * 1000,  // At least 3 minutes between incidents
      maxIntervalMs: 8 * 60 * 1000   // At most 8 minutes between incidents
    };
  }

  start() {
    if (this.running) return { status: 'already_running' };
    this.running = true;
    this._scheduleNext();

    logger.info('chaos-engine', 'start', 'Chaos engine started — random incidents will occur');
    return { status: 'started', config: this.config };
  }

  stop() {
    this.running = false;
    if (this.intervalId) { clearTimeout(this.intervalId); this.intervalId = null; }
    if (this.recoveryTimeout) { clearTimeout(this.recoveryTimeout); this.recoveryTimeout = null; }

    // Recover if mid-incident
    if (this.currentIncident) {
      failureInjector.reset();
      this.currentIncident.status = 'cancelled';
      this.currentIncident.endedAt = new Date().toISOString();
      this.currentIncident = null;
    }

    logger.info('chaos-engine', 'stop', 'Chaos engine stopped');
    return { status: 'stopped' };
  }

  _scheduleNext() {
    if (!this.running) return;

    const delay = this.config.minIntervalMs +
      Math.random() * (this.config.maxIntervalMs - this.config.minIntervalMs);

    this.intervalId = setTimeout(() => this._triggerRandom(), delay);
  }

  _triggerRandom() {
    if (!this.running) return;

    // Don't trigger if something is already active
    if (this.currentIncident) {
      this._scheduleNext();
      return;
    }

    // Pick a random scenario
    const scenario = CHAOS_SCENARIOS[Math.floor(Math.random() * CHAOS_SCENARIOS.length)];

    const incident = {
      id: `inc_${Date.now()}`,
      scenario_id: scenario.id,
      name: scenario.name,
      severity: scenario.severity,
      clue: scenario.clue,
      rootCause: scenario.rootCause,
      status: 'active',
      startedAt: new Date().toISOString(),
      endedAt: null,
      duration_seconds: scenario.duration / 1000
    };

    this.currentIncident = incident;
    this.incidentHistory.push(incident);

    // Keep history manageable
    if (this.incidentHistory.length > 50) this.incidentHistory.shift();

    // Inject the failure
    scenario.inject();

    logger.warn('chaos-engine', `incident/${scenario.id}`, `INCIDENT STARTED: ${scenario.name}`, {
      incident_id: incident.id,
      severity: scenario.severity,
      scenario_id: scenario.id,
      duration_seconds: scenario.duration / 1000
    });

    // Schedule auto-recovery
    this.recoveryTimeout = setTimeout(() => {
      failureInjector.reset();
      incident.status = 'resolved';
      incident.endedAt = new Date().toISOString();
      this.currentIncident = null;

      logger.info('chaos-engine', `incident/${scenario.id}`, `INCIDENT RESOLVED: ${scenario.name}`, {
        incident_id: incident.id,
        scenario_id: scenario.id
      });

      this._scheduleNext();
    }, scenario.duration);
  }

  getStatus() {
    return {
      running: this.running,
      current_incident: this.currentIncident,
      config: this.config,
      total_incidents_triggered: this.incidentHistory.length
    };
  }

  getHistory(limit = 20) {
    return this.incidentHistory.slice(-limit).reverse();
  }

  // Let them reveal the answer AFTER they've investigated
  getIncidentAnswer(incidentId) {
    const incident = this.incidentHistory.find(i => i.id === incidentId);
    if (!incident) return null;
    return {
      incident_id: incident.id,
      name: incident.name,
      root_cause: incident.rootCause,
      clue: incident.clue,
      severity: incident.severity,
      started_at: incident.startedAt,
      ended_at: incident.endedAt
    };
  }
}

const chaosEngine = new ChaosEngine();
module.exports = { chaosEngine };
