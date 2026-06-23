const { Pool } = require('pg');
const { logger } = require('../observability/logger');
const { metrics } = require('../observability/metrics');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://minibank:minibank@localhost:5432/minibank',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.DATABASE_URL && process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  logger.error('database', 'pool', 'Unexpected database pool error', { error: err.message });
  metrics.recordDbError();
});

// Instrumented query function
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    metrics.recordDbQuery(duration);
    return result;
  } catch (err) {
    const duration = Date.now() - start;
    metrics.recordDbQuery(duration);
    metrics.recordDbError();
    logger.error('database', 'query', `Query failed: ${err.message}`, {
      query: text.slice(0, 100),
      duration_ms: duration
    });
    throw err;
  }
}

async function getClient() {
  return pool.connect();
}

function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  };
}

module.exports = { query, getClient, getPoolStats, pool };
