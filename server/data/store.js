// Database-backed store — replaces in-memory Maps
// All functions are async and query PostgreSQL
const { query, getClient } = require('../database/pool');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// ==================== USERS ====================
async function createUser(firstName, lastName, email, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  const userId = uuidv4();
  const accountId = uuidv4();
  const accountNumber = String(Math.floor(10000000 + Math.random() * 90000000));

  const client = await getClient();
  try {
    await client.query('BEGIN');

    await client.query(
      'INSERT INTO users (id, first_name, last_name, email, password_hash) VALUES ($1, $2, $3, $4, $5)',
      [userId, firstName, lastName, email, passwordHash]
    );

    await client.query(
      'INSERT INTO accounts (id, user_id, account_number, balance) VALUES ($1, $2, $3, $4)',
      [accountId, userId, accountNumber, 100.00]
    );

    await client.query(
      'INSERT INTO cards (user_id, last_four, holder_name, expiry) VALUES ($1, $2, $3, $4)',
      [userId, String(Math.floor(1000 + Math.random() * 9000)), `${firstName} ${lastName}`.toUpperCase(), '12/28']
    );

    await client.query('COMMIT');

    return { id: userId, firstName, lastName, email };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function findUserByEmail(email) {
  const res = await query('SELECT * FROM users WHERE email = $1', [email]);
  return res.rows[0] || null;
}

async function findUserById(id) {
  const res = await query('SELECT * FROM users WHERE id = $1', [id]);
  return res.rows[0] || null;
}

// ==================== ACCOUNTS ====================
async function getAccount(userId) {
  const res = await query('SELECT * FROM accounts WHERE user_id = $1', [userId]);
  return res.rows[0] || null;
}

async function updateBalance(accountId, newBalance) {
  await query('UPDATE accounts SET balance = $1 WHERE id = $2', [newBalance, accountId]);
}

// ==================== TRANSACTIONS ====================
async function addTransaction({ fromAccount, toAccount, amount, status, reference, description, category, type }) {
  const res = await query(
    `INSERT INTO transactions (from_account, to_account, amount, status, reference, description, category, type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [fromAccount, toAccount || null, amount, status || 'SUCCESS', reference || '', description || '', category || 'transfers', type || 'debit']
  );
  return res.rows[0];
}

async function getTransactions(accountId, { limit = 50, offset = 0, category, search } = {}) {
  let where = 'WHERE (from_account = $1 OR to_account = $1)';
  const params = [accountId];
  let paramIdx = 2;

  if (category) {
    where += ` AND category = $${paramIdx}`;
    params.push(category);
    paramIdx++;
  }
  if (search) {
    where += ` AND description ILIKE $${paramIdx}`;
    params.push(`%${search}%`);
    paramIdx++;
  }

  const countRes = await query(`SELECT COUNT(*) FROM transactions ${where}`, params);
  const total = parseInt(countRes.rows[0].count);

  params.push(limit, offset);
  const res = await query(
    `SELECT * FROM transactions ${where} ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    params
  );

  return { transactions: res.rows, total };
}

// ==================== PAYEES ====================
async function getPayees(userId) {
  const res = await query('SELECT * FROM payees WHERE user_id = $1 ORDER BY name', [userId]);
  return res.rows;
}

async function addPayee(userId, { name, sortCode, accountNumber }) {
  const res = await query(
    'INSERT INTO payees (user_id, name, sort_code, account_number) VALUES ($1, $2, $3, $4) RETURNING *',
    [userId, name, sortCode, accountNumber]
  );
  return res.rows[0];
}

async function updatePayee(userId, payeeId, { name, sortCode, accountNumber }) {
  const res = await query(
    'UPDATE payees SET name = COALESCE($1, name), sort_code = COALESCE($2, sort_code), account_number = COALESCE($3, account_number) WHERE id = $4 AND user_id = $5 RETURNING *',
    [name, sortCode, accountNumber, payeeId, userId]
  );
  return res.rows[0] || null;
}

async function deletePayee(userId, payeeId) {
  await query('DELETE FROM payees WHERE id = $1 AND user_id = $2', [payeeId, userId]);
}

// ==================== SAVINGS POTS ====================
async function getPots(userId) {
  const res = await query('SELECT * FROM savings_pots WHERE user_id = $1 ORDER BY created_at', [userId]);
  return res.rows;
}

async function createPot(userId, { name, goal }) {
  const res = await query(
    'INSERT INTO savings_pots (user_id, name, goal_amount) VALUES ($1, $2, $3) RETURNING *',
    [userId, name, goal || 0]
  );
  return res.rows[0];
}

async function getPot(userId, potId) {
  const res = await query('SELECT * FROM savings_pots WHERE id = $1 AND user_id = $2', [potId, userId]);
  return res.rows[0] || null;
}

async function updatePotBalance(potId, newBalance) {
  await query('UPDATE savings_pots SET balance = $1 WHERE id = $2', [newBalance, potId]);
}

async function deletePot(userId, potId) {
  const res = await query('SELECT * FROM savings_pots WHERE id = $1 AND user_id = $2', [potId, userId]);
  const pot = res.rows[0];
  if (pot) {
    await query('DELETE FROM savings_pots WHERE id = $1', [potId]);
  }
  return pot;
}

// ==================== CARDS ====================
async function getCard(userId) {
  const res = await query('SELECT * FROM cards WHERE user_id = $1', [userId]);
  return res.rows[0] || null;
}

// ⚠️  SECURITY NOTE (teaching point):
// This function interpolates column names directly into the SQL string from the `updates` object keys.
// While the VALUES are safely parameterised ($1, $2, etc.), the COLUMN NAMES are not.
// In production, this is a SQL injection risk — an attacker who controls the keys of `updates`
// could inject arbitrary SQL via a crafted column name like: "status; DROP TABLE users; --"
// Safe alternatives:
//   1. Whitelist allowed column names before interpolation
//   2. Use an ORM that handles this (Knex, Prisma, etc.)
//   3. Write explicit UPDATE statements per field
// This is left as-is for the learning exercise. The calling code controls the keys, so it's
// safe in THIS context — but never trust user-provided keys in production.
async function updateCard(userId, updates) {
  const fields = [];
  const values = [];
  let idx = 1;
  for (const [key, val] of Object.entries(updates)) {
    fields.push(`${key} = $${idx}`);
    values.push(val);
    idx++;
  }
  values.push(userId);
  await query(`UPDATE cards SET ${fields.join(', ')} WHERE user_id = $${idx}`, values);
  return getCard(userId);
}

// ==================== AUDIT LOGS ====================
async function writeAudit({ serviceName, action, severity, message, correlationId, userId, metadata }) {
  await query(
    `INSERT INTO audit_logs (service_name, action, severity, message, correlation_id, user_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [serviceName, action, severity, message, correlationId || null, userId || null, metadata ? JSON.stringify(metadata) : null]
  );
}

async function getAuditLogs({ limit = 100, severity, serviceName } = {}) {
  let where = 'WHERE 1=1';
  const params = [];
  let idx = 1;
  if (severity) { where += ` AND severity = $${idx}`; params.push(severity); idx++; }
  if (serviceName) { where += ` AND service_name = $${idx}`; params.push(serviceName); idx++; }
  params.push(limit);
  const res = await query(`SELECT * FROM audit_logs ${where} ORDER BY timestamp DESC LIMIT $${idx}`, params);
  return res.rows;
}

module.exports = {
  createUser, findUserByEmail, findUserById,
  getAccount, updateBalance,
  addTransaction, getTransactions,
  getPayees, addPayee, updatePayee, deletePayee,
  getPots, createPot, getPot, updatePotBalance, deletePot,
  getCard, updateCard,
  writeAudit, getAuditLogs
};
