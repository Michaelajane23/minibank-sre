// Database initialization — creates all tables
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://minibank:minibank@localhost:5432/minibank';

async function init() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  console.log('🗄️  Initializing database schema...');

  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Accounts table
    CREATE TABLE IF NOT EXISTS accounts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      account_number VARCHAR(8) NOT NULL,
      sort_code VARCHAR(8) NOT NULL DEFAULT '04-00-04',
      balance DECIMAL(12,2) DEFAULT 0.00,
      account_type VARCHAR(20) DEFAULT 'current',
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Transactions table
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      from_account UUID REFERENCES accounts(id),
      to_account UUID REFERENCES accounts(id),
      amount DECIMAL(12,2) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      reference VARCHAR(255),
      description VARCHAR(255),
      category VARCHAR(50),
      type VARCHAR(10) DEFAULT 'debit',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Savings pots
    CREATE TABLE IF NOT EXISTS savings_pots (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      balance DECIMAL(12,2) DEFAULT 0.00,
      goal_amount DECIMAL(12,2) DEFAULT 0.00,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Cards
    CREATE TABLE IF NOT EXISTS cards (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      last_four VARCHAR(4) NOT NULL,
      holder_name VARCHAR(200) NOT NULL,
      expiry VARCHAR(5) NOT NULL,
      status VARCHAR(20) DEFAULT 'active',
      card_type VARCHAR(20) DEFAULT 'debit',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Payees
    CREATE TABLE IF NOT EXISTS payees (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(200) NOT NULL,
      sort_code VARCHAR(8) NOT NULL,
      account_number VARCHAR(8) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Audit logs (critical for banking)
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      service_name VARCHAR(50) NOT NULL,
      action VARCHAR(100) NOT NULL,
      severity VARCHAR(20) NOT NULL,
      message TEXT,
      correlation_id UUID,
      user_id UUID,
      metadata JSONB,
      timestamp TIMESTAMPTZ DEFAULT NOW()
    );

    -- Mission completions (student progress tracking)
    CREATE TABLE IF NOT EXISTS mission_completions (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mission_id INTEGER NOT NULL,
      completed_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, mission_id)
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_account);
    CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(to_account);
    CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_service ON audit_logs(service_name);
    CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_savings_pots_user ON savings_pots(user_id);
    CREATE INDEX IF NOT EXISTS idx_mission_completions_user ON mission_completions(user_id);
  `);

  console.log('✅ Database schema created successfully');
  await pool.end();
}

init().catch(err => {
  console.error('❌ Database init failed:', err.message);
  process.exit(1);
});
