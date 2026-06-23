# MiniBank Runbooks

These runbooks mirror what a real SRE team uses during incidents. When you trigger a scenario or spot an issue in Splunk/Grafana, follow the relevant runbook to diagnose and resolve it.

## How to use

1. Trigger a scenario: `POST http://localhost:3000/scenarios/<id>/trigger`
2. Spot the problem in Grafana or Splunk
3. Open the matching runbook
4. Follow the steps to investigate
5. Verify recovery

## Available Runbooks

| Runbook | When to use |
|---------|-------------|
| [high-error-rate.md](./high-error-rate.md) | Error rate exceeds 10% |
| [payment-service-degraded.md](./payment-service-degraded.md) | Payment latency or failures |
| [full-outage.md](./full-outage.md) | All services returning 503 |
| [latency-spike.md](./latency-spike.md) | p95 latency above threshold |
| [cascading-failure.md](./cascading-failure.md) | Multiple services degrading in sequence |
