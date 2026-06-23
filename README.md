# MiniBank

A realistic production-style digital banking web application and SRE learning platform. MiniBank simulates a real bank — complete with accounts, transactions, transfers, savings pots, card management, and spending analytics — while producing structured telemetry that external observability tools can consume.

## Quick Start

```bash
npm install

# Start PostgreSQL (via Docker)
docker-compose up -d postgres

# Initialize database schema
npm run db:init

# Seed demo data (5 users, transactions, pots, cards)
npm run db:seed

# Build frontend and start server
npm run build
npm start
```

Open http://localhost:3000

> **Note:** PostgreSQL must be running and configured before starting the server. See `.env.example` for the required `DATABASE_URL` environment variable.

### Development Mode

```bash
npm run dev
```

Runs the Express backend on port 3000 and Vite dev server on port 5173 with hot reload.

### Demo Accounts

All demo users use password: `password123`

| User | Email | Balance |
|------|-------|---------|
| Sarah Johnson | sarah.johnson@minibank.io | £2,450.32 |
| James Carter | james.carter@minibank.io | £18,230.00 |
| Emily Thompson | emily.thompson@minibank.io | £120.22 |
| Michael Patel | michael.patel@minibank.io | £7,892.45 |
| Rebecca Wilson | rebecca.wilson@minibank.io | £34,500.00 |

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, React Router, React Query, Chart.js
- **Backend**: Node.js, Express, JWT authentication
- **Database**: PostgreSQL with connection pooling (pg)
- **Deployment**: Docker Compose (frontend + backend + postgres)

## Features

| Feature | Description |
|---------|-------------|
| Authentication | Signup, login, logout with JWT tokens |
| Dashboard | Balance, account details, spending analytics, recent activity |
| Transactions | Full history with search, category filter, pagination |
| Transfers | Step-based send money flow with fraud check, ledger, notifications |
| Payees | Add, edit, remove payment recipients |
| Savings Pots | Create pots, deposit, withdraw, track goals |
| Card Management | Freeze, unfreeze, replace debit card |
| Operator Training | Live service health dashboard, SLO tracking, chaos controls |
| Student Missions | Guided incident investigation exercises |

## API Endpoints

### Authentication
```
POST /api/signup      { name, email, password }
POST /api/login       { email, password }
POST /api/logout
```

### Banking
```
GET  /api/account
GET  /api/transactions?limit=50&offset=0&category=&search=
POST /api/transfer    { payeeId, amount, reference }
```

### Payees
```
GET    /api/payees
POST   /api/payees        { name, sortCode, accountNumber }
PUT    /api/payees/:id    { name, sortCode, accountNumber }
DELETE /api/payees/:id
```

### Savings Pots
```
GET    /api/pots
POST   /api/pots               { name, goal }
POST   /api/pots/:id/deposit   { amount }
POST   /api/pots/:id/withdraw  { amount }
DELETE /api/pots/:id
```

### Card
```
GET  /api/card
POST /api/card/freeze
POST /api/card/unfreeze
POST /api/card/replace
```

### SRE / Observability
```
GET  /health                    # Liveness probe
GET  /health/ready              # Readiness probe
GET  /health/detailed           # Per-service health
GET  /metrics                   # Prometheus exposition format
GET  /slo                       # SLI/SLO and error budget
GET  /scenarios                 # List chaos scenarios
POST /scenarios/:id/trigger     # Trigger a scenario
POST /scenarios/reset           # Reset all services
GET  /chaos                     # Chaos engine status
POST /chaos/start               # Enable random incidents
POST /chaos/stop                # Disable random incidents
GET  /missions                  # Training missions list
GET  /missions/:id              # Mission detail
POST /api/missions/:id/complete # Mark mission complete
GET  /api/missions/progress     # Get completed missions
```

## Observability

MiniBank generates structured JSON logs to stdout for every request:

```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "correlation_id": "a1b2c3d4-...",
  "service_name": "payment-service",
  "endpoint": "POST /api/transfer",
  "status_code": 201,
  "response_time_ms": 45,
  "severity": "INFO",
  "user_id": "usr_abc123"
}
```

Designed for ingestion by Splunk, Datadog, Grafana/Loki, and Kibana.

## Service Architecture

```
Transfer flow:
  User → payment-service → fraud-service → ledger-service → notification-service
```

Each service can fail independently, producing different error patterns for investigation.

## Docker

```bash
docker-compose up
```

Starts PostgreSQL + the full application, auto-initialised and seeded.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Server port |
| DATABASE_URL | postgresql://minibank:minibank@localhost:5432/minibank | PostgreSQL connection |
| JWT_SECRET | (built-in dev default) | JWT signing secret |
| NODE_ENV | development | Environment mode |
