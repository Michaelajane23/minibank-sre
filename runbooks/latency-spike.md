# Runbook: Latency Spike

## Severity: P3

## Symptoms
- No errors in logs (all 200s)
- But response times are 5-10x higher than normal
- Users experiencing slow page loads
- p95 in Grafana is above 1000ms

## Why this is tricky
This is one of the hardest issues to spot because:
- No errors are generated
- Status codes are all 200
- Severity is "INFO" in all logs
- Only the `response_time_ms` field reveals the problem

This teaches you to monitor latency, not just errors.

## Investigation Steps

### 1. Check current latency

```bash
curl http://localhost:3000/slo
```

Look at `slis.latency_p95.current` — is it above the 1000ms target?

### 2. Splunk query for slow requests

```
response_time_ms > 500 | stats count by service_name | sort -count
```

### 3. Find the slowest requests

```
response_time_ms > 1000 | table timestamp service_name endpoint response_time_ms correlation_id | sort -response_time_ms
```

### 4. Compare to normal baseline

```
response_time_ms > 0 | timechart span=1m avg(response_time_ms) by service_name
```

Normal average should be < 10ms. During a spike, it'll be > 500ms.

### 5. Check if it's all services or just one

**Grafana:** Look at `minibank_http_response_time_ms` per service.

If ALL services are slow → infrastructure issue (network, CPU, injected)
If ONE service is slow → that specific service has a problem

### 6. Check the health endpoint

```bash
curl http://localhost:3000/health/detailed
```

Services will show `latency_injection_ms > 0` if it's an injected scenario.

## Resolution

```bash
curl -X POST http://localhost:3000/scenarios/reset
```

## Verification

1. Run a few requests and check response time:
```bash
time curl -s http://localhost:3000/api/login -H "Content-Type: application/json" -d '{"email":"sarah.connor@minibank.io","password":"password123"}' > /dev/null
```
Should complete in < 0.1s

2. Check SLO — p95 should be dropping
3. Grafana latency panel should return to baseline
