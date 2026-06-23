# Runbook: Full Service Outage

## Severity: P1 — CRITICAL

## Symptoms
- ALL requests returning 503
- `/health/ready` returns `not_ready`
- Error rate at or near 100%
- No users can access any functionality

## Investigation Steps

### 1. Confirm total outage

```bash
curl http://localhost:3000/health/ready
```

Expected response when outage active:
```json
{"status": "not_ready", "reason": "6 service(s) disabled", "disabled": [...]}
```

### 2. Check Grafana

`minibank_service_healthy` should show `0` for all services.

### 3. Determine start time

**Splunk:**
```
severity=ERROR | head 1 | table timestamp service_name
```

Or:
```
status_code=503 | stats earliest(timestamp) as outage_started
```

### 4. Check if all services are equally affected

**Splunk:**
```
status_code>=500 | stats count by service_name
```

If ALL services show errors at the same time, it's likely infrastructure-level (not a single service bug).

### 5. Check the SLO impact

```bash
curl http://localhost:3000/slo
```

A full outage will rapidly burn through error budget.

## Resolution

```bash
curl -X POST http://localhost:3000/scenarios/reset
```

## Verification

1. `curl http://localhost:3000/health/ready` → returns `{"status": "ready"}`
2. `curl http://localhost:3000/health/detailed` → all services show `healthy: true`
3. Test a login:
```bash
curl http://localhost:3000/api/login -H "Content-Type: application/json" -d '{"email":"sarah.connor@minibank.io","password":"password123"}'
```
4. Watch Grafana — error rate should drop to 0% within 60 seconds

## Post-Incident

- How long was the outage?
- How many requests failed? (Check Splunk count)
- How much error budget was consumed?
- What caused it? (Check scenario-runner logs in Splunk: `service_name="scenario-runner"`)
