// Enhanced metrics collection — API, banking, and database metrics
class Metrics {
  constructor() {
    this.data = [];
    this.windowMs = 60000;
    this.counters = {
      transfers: 0,
      failedTransfers: 0,
      loginFailures: 0,
      cardFreezes: 0,
      dbErrors: 0
    };
    this.dbQueryDurations = [];
    this.activeUsers = new Set();
    setInterval(() => this.cleanup(), 30000);
  }

  record(service, statusCode, responseTimeMs) {
    this.data.push({ service, statusCode, responseTimeMs, timestamp: Date.now() });
  }

  recordTransfer() { this.counters.transfers++; }
  recordFailedTransfer() { this.counters.failedTransfers++; }
  recordLoginFailure() { this.counters.loginFailures++; }
  recordCardFreeze() { this.counters.cardFreezes++; }
  recordDbError() { this.counters.dbErrors++; }
  recordDbQuery(durationMs) { this.dbQueryDurations.push({ duration: durationMs, timestamp: Date.now() }); }
  recordActiveUser(userId) { this.activeUsers.add(userId); }

  cleanup() {
    const cutoff = Date.now() - (60 * 60 * 1000);
    this.data = this.data.filter(d => d.timestamp > cutoff);
    this.dbQueryDurations = this.dbQueryDurations.filter(d => d.timestamp > cutoff);
    // Clear active users every 5 minutes
    if (Date.now() % 300000 < 30000) this.activeUsers.clear();
  }

  getSummary(minutes = 5) {
    const since = Date.now() - (minutes * 60 * 1000);
    const recent = this.data.filter(d => d.timestamp > since);
    const errors = recent.filter(d => d.statusCode >= 500);
    const latencies = recent.map(d => d.responseTimeMs).sort((a, b) => a - b);

    return {
      requests: recent.length,
      errors: errors.length,
      errorRate: recent.length > 0 ? (errors.length / recent.length * 100).toFixed(2) : '0',
      avgLatency: latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
      p95: latencies.length > 0 ? latencies[Math.ceil(0.95 * latencies.length) - 1] || 0 : 0
    };
  }

  getDbStats() {
    const since = Date.now() - 5 * 60 * 1000;
    const recent = this.dbQueryDurations.filter(d => d.timestamp > since);
    const durations = recent.map(d => d.duration).sort((a, b) => a - b);
    return {
      queries: recent.length,
      avgDuration: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
      p95Duration: durations.length > 0 ? durations[Math.ceil(0.95 * durations.length) - 1] || 0 : 0
    };
  }

  getCounters() { return { ...this.counters }; }
}

const metrics = new Metrics();
module.exports = { metrics };
