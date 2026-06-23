# How to Use the Chaos Engine

## What is it?

The chaos engine randomly triggers incidents in MiniBank — just like things break randomly in production. Your job is to find what's broken and figure out why.

## Getting Started

### 1. Turn it on

```bash
curl -X POST http://localhost:3000/chaos/start
```

That's it. Random incidents will now happen every 3–8 minutes automatically.

### 2. Watch for problems

Keep these open:
- **Grafana** — watch the dashboards for error spikes or latency increases
- **Splunk** — search for `severity=ERROR` or `severity=WARN`
- **Health check** — `curl http://localhost:3000/health/detailed`

### 3. When something breaks

You'll know because:
- Grafana shows a spike in errors or latency
- Splunk shows ERROR logs appearing
- The health check shows a service is unhealthy
- The banking app feels slow or shows errors

### 4. Investigate

**Step 1:** What's the clue?
```bash
curl http://localhost:3000/chaos/history
```
This tells you WHAT is happening (the symptom), but not WHY.

**Step 2:** Find the affected service in Splunk:
```
severity=ERROR | stats count by service_name
```

**Step 3:** Look at the timeline:
```
severity=ERROR | timechart span=1m count by service_name
```

**Step 4:** Check the metrics:
```bash
curl http://localhost:3000/health/detailed
```

**Step 5:** Check the SLO impact:
```bash
curl http://localhost:3000/slo
```

### 5. Reveal the answer

Once you think you know what the root cause is, check your answer:
```bash
curl http://localhost:3000/chaos/reveal/<incident-id>
```

(Get the incident ID from `/chaos/history`)

### 6. Turn it off

```bash
curl -X POST http://localhost:3000/chaos/stop
```

## Tips

- Incidents last 35–60 seconds, then auto-recover
- There's always 3–8 minutes between incidents, so you have time to investigate
- Start by looking at which SERVICE is affected
- Then look at WHETHER it's errors or latency (they're different problems!)
- Use correlation IDs to trace a single request through the system

## What you're learning

- How to spot issues in monitoring tools (Grafana, Splunk)
- How to read structured logs
- How to identify root causes from symptoms
- How to use SLO/error budgets to understand severity
- How real SRE teams handle incidents at work
