const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const { requestMiddleware } = require('./middleware/request');
const { errorHandler } = require('./middleware/error');
const { logger } = require('./observability/logger');
const { startGrafanaPush } = require('./observability/grafana-push');

// Route modules
const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/account');
const transactionRoutes = require('./routes/transactions');
const transferRoutes = require('./routes/transfer');
const payeeRoutes = require('./routes/payees');
const potRoutes = require('./routes/pots');
const cardRoutes = require('./routes/card');
const analyticsRoutes = require('./routes/analytics');
const healthRoutes = require('./routes/health');
const prometheusRoutes = require('./routes/prometheus');
const scenarioRoutes = require('./routes/scenarios');
const webhookRoutes = require('./routes/webhooks');
const sloRoutes = require('./routes/slo');
const chaosRoutes = require('./routes/chaos');
const { missionsRoutes, missionsApiRoutes } = require('./routes/missions');
const incidentRoutes = require('./routes/incidents');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests', message: 'Rate limit exceeded. Try again later.' }
});

app.use(cors());
app.use(express.json());
app.use(limiter);
app.use(requestMiddleware);

// API routes
app.use('/api', authRoutes);
app.use('/api', accountRoutes);
app.use('/api', transactionRoutes);
app.use('/api', transferRoutes);
app.use('/api', payeeRoutes);
app.use('/api', potRoutes);
app.use('/api', cardRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', missionsApiRoutes);

// SRE / Observability infrastructure routes (no rate limit)
app.use('/', healthRoutes);
app.use('/', prometheusRoutes);
app.use('/', scenarioRoutes);
app.use('/', webhookRoutes);
app.use('/', sloRoutes);
app.use('/', chaosRoutes);
app.use('/', missionsRoutes);
app.use('/', incidentRoutes);

// Serve built frontend in production
app.use(express.static(path.join(__dirname, '..', 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info('server', 'startup', `MiniBank server running on port ${PORT}`);
  console.log(`\n🏦 MiniBank server running on http://localhost:${PORT}\n`);
  startGrafanaPush();
});

module.exports = app;
