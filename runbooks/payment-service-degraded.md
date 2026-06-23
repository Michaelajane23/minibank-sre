# Runbook: Payment Service Degraded

## Severity: P2

## Symptoms
- Transfer requests timing out or failing
- High latency on POST /api/transfer
- Users unable to send money
- `payment-service` errors in Splunk

## Investigation Steps

### 1. Confirm the issue

```bash
# Check service health
curl http://localhost:3000/health/detailed | python3 -m json.tool
```

Look at `services.payment-service.state` — is it `degraded` or `failing`?

### 2. Check current latency

**Splunk query:**
```
service_name="payment-service" | stats avg(response_time_ms) as avg_latency, p95(response_time_ms) as p95_latency
```

**Grafana:** Check `minibank_http_response_time_ms{service="payment-service", quantile="0.95"}`

Normal p95 for payment-service is < 50ms. If it's > 1000ms, the service is degraded.

### 3. Check error rate for this service only

**Splunk:**
```
service_name="payment-service" | stats count(eval(status_code>=500)) as errors, count as total | eval error_rate=errors/total*100
```

### 4. Look at affected users

**Splunk:**
```
service_name="payment-service" severity=ERROR | stats count by user_id
```

Are all users affected, or just some?

### 5. Check downstream impact

Is the transaction service also degraded? Payment failures can cascade.
```
service_name="transaction-service" | stats avg(response_time_ms)
```

## Resolution

```bash
# Reset all failure injection
curl -X POST http://localhost:3000/scenarios/reset
```

## Verification

1. Run a test transfer:
```bash
TOKEN=$(curl -s http://localhost:3000/api/login -H "Content-Type: application/json" -d '{"email":"sarah.connor@minibank.io","password":"password123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
curl -s http://localhost:3000/api/transfer -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"payeeId":"pay_sarah_01","amount":1,"reference":"test"}'
```
2. Confirm response time < 100ms
3. Check Grafana — latency returning to normal
