# Runbook: Cascading Failure

## Severity: P1

## Symptoms
- Errors start in ONE service
- Then spread to other services over time
- Timeline shows a "wave" pattern in Splunk
- Different services fail at different times

## Why this happens in production
In real systems, services depend on each other. If the payment service is slow, the transaction service (which calls it) also becomes slow. This creates a "cascade" — one failure causes others.

## Investigation Steps

### 1. Find the ROOT CAUSE service

**Splunk — find which service failed FIRST:**
```
severity=ERROR | stats earliest(timestamp) as first_error by service_name | sort first_error
```

The service with the earliest error is likely the root cause.

### 2. Build a timeline

```
severity=ERROR OR severity=WARN | timechart span=30s count by service_name
```

You should see errors appear in this order:
1. First: payment-service (the source)
2. Then: transaction-service (30s later)
3. Then: account-service (60s later)

### 3. Trace a single request through the cascade

Pick a `correlation_id` from a failed payment request:
```
service_name="payment-service" severity=ERROR | head 1 | table correlation_id
```

Then search for ALL logs with that ID:
```
correlation_id="<paste-id-here>" | sort timestamp
```

### 4. Check current state of all services

```bash
curl http://localhost:3000/health/detailed | python3 -m json.tool
```

### 5. Assess blast radius

**How many users are affected?**
```
severity=ERROR | stats dc(user_id) as affected_users
```

**How many requests failed?**
```
status_code>=500 | stats count
```

## Resolution

```bash
curl -X POST http://localhost:3000/scenarios/reset
```

## Key Learning
In a cascading failure:
- Fix the ROOT CAUSE first (the first service that failed)
- Don't get distracted by downstream symptoms
- Use timestamps to build a timeline
- Correlation IDs let you trace a single request across services

## Verification

1. Check all services healthy: `curl http://localhost:3000/health/detailed`
2. Run end-to-end test (login → check balance → transfer)
3. Watch Grafana — all error rates should return to 0%
4. SLO endpoint shows error budget recovering
