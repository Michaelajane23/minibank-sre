# Runbook: High Error Rate

## Severity: P2

## Symptoms
- Error rate in Grafana exceeds 10%
- Multiple 500/503 responses in Splunk
- Users reporting failures

## Investigation Steps

### 1. Check which service is failing

**Splunk query:**
```
severity=ERROR | stats count by service_name | sort -count
```

**Grafana:** Look at `minibank_http_errors_total` broken down by `service` label.

### 2. Check if it's injection or a real bug

```bash
curl http://localhost:3000/health/detailed
```

If a service shows `state: "failing"` or `state: "disabled"`, it's an injected scenario.

### 3. Check the error budget

```bash
curl http://localhost:3000/slo
```

Is the error budget exhausted? If `burn_percent > 80%`, this is critical.

### 4. Look at the timeline

**Splunk query:**
```
severity=ERROR | timechart span=1m count by service_name
```

When did errors start? Is it getting worse or recovering?

### 5. Check correlation IDs

Pick an error from Splunk. Take the `correlation_id` and search for all logs with that ID:
```
correlation_id="<paste-id-here>"
```

This shows the full request journey.

## Resolution

If this is a scenario:
```bash
curl -X POST http://localhost:3000/scenarios/reset
```

If it's a real issue, escalate to the service owner.

## Verification

After resolution:
1. Check `GET /health/ready` returns 200
2. Confirm error rate dropping in Grafana
3. Run a test request through the affected service
