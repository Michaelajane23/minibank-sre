// Failure injection system — backend-only, no UI exposure
class FailureInjector {
  constructor() {
    this.services = {};
    // Initialize with all healthy
    ['auth-service', 'account-service', 'payment-service', 'transaction-service', 'savings-service', 'analytics-service', 'fraud-service', 'ledger-service', 'notification-service'].forEach(s => {
      this.services[s] = { state: 'healthy', latencyMs: 0, errorRate: 0 };
    });
  }

  setState(service, state) {
    const presets = {
      healthy: { state: 'healthy', latencyMs: 0, errorRate: 0 },
      degraded: { state: 'degraded', latencyMs: 800, errorRate: 0.05 },
      failing: { state: 'failing', latencyMs: 2000, errorRate: 0.4 },
      disabled: { state: 'disabled', latencyMs: 0, errorRate: 1.0 }
    };
    if (!this.services[service] || !presets[state]) return false;
    this.services[service] = presets[state];
    return true;
  }

  setCustom(service, config) {
    if (!this.services[service]) return false;
    this.services[service] = { state: 'custom', latencyMs: config.latencyMs || 0, errorRate: config.errorRate || 0 };
    return true;
  }

  check(service) {
    const config = this.services[service];
    if (!config || config.state === 'healthy') return { delay: 0, shouldFail: false };

    const jitter = Math.random() * (config.latencyMs * 0.3);
    return {
      delay: config.latencyMs > 0 ? Math.round(config.latencyMs + jitter) : 0,
      shouldFail: Math.random() < config.errorRate,
      status: config.state === 'disabled' ? 503 : 500
    };
  }

  getStatus() { return { ...this.services }; }
  reset() { Object.keys(this.services).forEach(s => this.services[s] = { state: 'healthy', latencyMs: 0, errorRate: 0 }); }
}

const failureInjector = new FailureInjector();
module.exports = { failureInjector };
