// Seed realistic demo banking data
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://minibank:minibank@localhost:5432/minibank';

const DEMO_USERS = [
  { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.johnson@minibank.io', balance: 2450.32 },
  { firstName: 'James', lastName: 'Carter', email: 'james.carter@minibank.io', balance: 18230.00 },
  { firstName: 'Emily', lastName: 'Thompson', email: 'emily.thompson@minibank.io', balance: 120.22 },
  { firstName: 'Michael', lastName: 'Patel', email: 'michael.patel@minibank.io', balance: 7892.45 },
  { firstName: 'Rebecca', lastName: 'Wilson', email: 'rebecca.wilson@minibank.io', balance: 34500.00 }
];

const MERCHANTS = [
  { desc: 'Tesco Express', cat: 'groceries', min: 3, max: 65 },
  { desc: 'Sainsbury\'s', cat: 'groceries', min: 8, max: 95 },
  { desc: 'Waitrose', cat: 'groceries', min: 15, max: 120 },
  { desc: 'Netflix', cat: 'subscriptions', min: 10, max: 16 },
  { desc: 'Spotify', cat: 'subscriptions', min: 10, max: 11 },
  { desc: 'Disney+', cat: 'subscriptions', min: 7, max: 10 },
  { desc: 'TfL', cat: 'transport', min: 2, max: 8 },
  { desc: 'Uber', cat: 'transport', min: 8, max: 35 },
  { desc: 'Shell Petrol', cat: 'transport', min: 40, max: 85 },
  { desc: 'Pret A Manger', cat: 'restaurants', min: 4, max: 12 },
  { desc: 'Nando\'s', cat: 'restaurants', min: 12, max: 45 },
  { desc: 'Wagamama', cat: 'restaurants', min: 10, max: 30 },
  { desc: 'Amazon', cat: 'shopping', min: 8, max: 150 },
  { desc: 'John Lewis', cat: 'shopping', min: 20, max: 200 },
  { desc: 'ASOS', cat: 'shopping', min: 15, max: 80 },
  { desc: 'Council Tax', cat: 'bills', min: 120, max: 200 },
  { desc: 'Thames Water', cat: 'bills', min: 25, max: 50 },
  { desc: 'British Gas', cat: 'bills', min: 60, max: 140 },
  { desc: 'EE Mobile', cat: 'bills', min: 25, max: 45 },
  { desc: 'Sky Broadband', cat: 'bills', min: 35, max: 55 },
  { desc: 'Salary', cat: 'income', min: 2200, max: 4500 }
];

async function seed() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  console.log('🌱 Seeding demo data...');

  // Skip if already seeded (check if users exist)
  const existing = await pool.query('SELECT COUNT(*) FROM users');
  if (parseInt(existing.rows[0].count) > 0) {
    console.log('✅ Database already seeded — skipping');
    await pool.end();
    return;
  }

  const passwordHash = await bcrypt.hash('password123', 10);

  for (const user of DEMO_USERS) {
    const userId = uuidv4();
    const accountId = uuidv4();
    const accountNumber = String(Math.floor(10000000 + Math.random() * 90000000));

    // Create user
    await pool.query(
      'INSERT INTO users (id, first_name, last_name, email, password_hash) VALUES ($1, $2, $3, $4, $5)',
      [userId, user.firstName, user.lastName, user.email, passwordHash]
    );

    // Create account
    await pool.query(
      'INSERT INTO accounts (id, user_id, account_number, balance) VALUES ($1, $2, $3, $4)',
      [accountId, userId, accountNumber, user.balance]
    );

    // Create card
    await pool.query(
      'INSERT INTO cards (user_id, last_four, holder_name, expiry) VALUES ($1, $2, $3, $4)',
      [userId, String(Math.floor(1000 + Math.random() * 9000)), `${user.firstName} ${user.lastName}`.toUpperCase(), '12/28']
    );

    // Create savings pots
    const pots = [
      { name: 'Emergency fund', balance: Math.round(Math.random() * 3000 * 100) / 100, goal: 5000 },
      { name: 'Holiday', balance: Math.round(Math.random() * 2000 * 100) / 100, goal: 3000 }
    ];
    for (const pot of pots) {
      await pool.query(
        'INSERT INTO savings_pots (user_id, name, balance, goal_amount) VALUES ($1, $2, $3, $4)',
        [userId, pot.name, pot.balance, pot.goal]
      );
    }

    // Create payees
    const payeeNames = DEMO_USERS.filter(u => u.email !== user.email).slice(0, 2);
    for (const p of payeeNames) {
      await pool.query(
        'INSERT INTO payees (user_id, name, sort_code, account_number) VALUES ($1, $2, $3, $4)',
        [userId, `${p.firstName} ${p.lastName}`, '04-00-04', String(Math.floor(10000000 + Math.random() * 90000000))]
      );
    }

    // Generate 40 transactions per user
    const now = Date.now();
    for (let i = 0; i < 40; i++) {
      const m = MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)];
      const amount = parseFloat((Math.random() * (m.max - m.min) + m.min).toFixed(2));
      const daysAgo = Math.floor(Math.random() * 90);
      const date = new Date(now - daysAgo * 86400000 - Math.random() * 86400000);
      const type = m.cat === 'income' ? 'credit' : 'debit';
      const status = Math.random() > 0.05 ? 'SUCCESS' : 'FAILED';

      await pool.query(
        `INSERT INTO transactions (from_account, amount, status, description, category, type, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [accountId, amount, status, m.desc, m.cat, type, date.toISOString()]
      );
    }

    console.log(`  ✓ ${user.firstName} ${user.lastName} (${user.email}) — £${user.balance.toFixed(2)}`);
  }

  // --- Seed sarah.connor@minibank.io (static account for runbook examples) ---
  const sarahConnorId = uuidv4();
  const sarahConnorAccountId = uuidv4();
  const sarahConnorPayeeId = uuidv4();
  await pool.query(
    'INSERT INTO users (id, first_name, last_name, email, password_hash) VALUES ($1, $2, $3, $4, $5)',
    [sarahConnorId, 'Sarah', 'Connor', 'sarah.connor@minibank.io', passwordHash]
  );
  await pool.query(
    'INSERT INTO accounts (id, user_id, account_number, balance) VALUES ($1, $2, $3, $4)',
    [sarahConnorAccountId, sarahConnorId, '10203040', 8420.50]
  );
  await pool.query(
    'INSERT INTO cards (user_id, last_four, holder_name, expiry) VALUES ($1, $2, $3, $4)',
    [sarahConnorId, '4916', 'SARAH CONNOR', '09/27']
  );
  await pool.query(
    'INSERT INTO payees (id, user_id, name, sort_code, account_number) VALUES ($1, $2, $3, $4, $5)',
    [sarahConnorPayeeId, sarahConnorId, 'John Connor', '04-00-04', '50607080']
  );
  await pool.query(
    'INSERT INTO savings_pots (user_id, name, balance, goal_amount) VALUES ($1, $2, $3, $4)',
    [sarahConnorId, 'Emergency fund', 3000.00, 5000]
  );
  // Seed transactions for sarah.connor
  const scNow = Date.now();
  for (let i = 0; i < 25; i++) {
    const m = MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)];
    const amount = parseFloat((Math.random() * (m.max - m.min) + m.min).toFixed(2));
    const daysAgo = Math.floor(Math.random() * 60);
    const date = new Date(scNow - daysAgo * 86400000 - Math.random() * 86400000);
    const type = m.cat === 'income' ? 'credit' : 'debit';
    await pool.query(
      `INSERT INTO transactions (from_account, amount, status, description, category, type, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [sarahConnorAccountId, amount, 'SUCCESS', m.desc, m.cat, type, date.toISOString()]
    );
  }
  console.log(`  ✓ Sarah Connor (sarah.connor@minibank.io) — £8420.50 [static runbook account]`);

  // --- Seed ledger failure scenario for sarah.johnson@minibank.io (Mission 2) ---
  // Find sarah.johnson's account
  const sjResult = await pool.query("SELECT a.id FROM accounts a JOIN users u ON a.user_id = u.id WHERE u.email = 'sarah.johnson@minibank.io'");
  if (sjResult.rows.length > 0) {
    const sjAccountId = sjResult.rows[0].id;
    const ledgerFailTxId = uuidv4();
    const ledgerFailCorrelationId = uuidv4();
    const failDate = new Date(Date.now() - 2 * 86400000); // 2 days ago

    // Transaction where money LEFT the account (status SUCCESS — the debit happened)
    await pool.query(
      `INSERT INTO transactions (id, from_account, amount, status, description, category, type, reference, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [ledgerFailTxId, sjAccountId, 500.00, 'SUCCESS', 'Transfer to James Carter', 'transfers', 'debit', 'Rent payment', failDate.toISOString()]
    );

    // Audit log showing the ledger write failed AFTER the money was deducted
    await pool.query(
      `INSERT INTO audit_logs (service_name, action, severity, message, correlation_id, user_id, metadata, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'ledger-service',
        'ledger_write_failed',
        'CRITICAL',
        'Ledger write failed — transaction completed but financial record not persisted. Data inconsistency detected.',
        ledgerFailCorrelationId,
        (await pool.query("SELECT id FROM users WHERE email = 'sarah.johnson@minibank.io'")).rows[0].id,
        JSON.stringify({ transaction_id: ledgerFailTxId, amount: 500.00, from_account: sjAccountId }),
        failDate.toISOString()
      ]
    );
    console.log(`  ✓ Ledger failure scenario seeded for sarah.johnson@minibank.io (Mission 2)`);
  }

  // --- Seed additional demo users (8 more for realistic activity) ---
  const ADDITIONAL_USERS = [
    { firstName: 'James', lastName: 'Wilson', email: 'james.wilson@minibank.io', balance: 2340.50, lastFour: '4521' },
    { firstName: 'Emma', lastName: 'Thompson', email: 'emma.thompson@minibank.io', balance: 892.00, lastFour: '7823' },
    { firstName: 'Oliver', lastName: 'Brown', email: 'oliver.brown@minibank.io', balance: 5100.75, lastFour: '3367' },
    { firstName: 'Sophie', lastName: 'Davis', email: 'sophie.davis@minibank.io', balance: 156.20, lastFour: '9914' },
    { firstName: 'Liam', lastName: 'Harris', email: 'liam.harris@minibank.io', balance: 3750.00, lastFour: '6642' },
    { firstName: 'Amelia', lastName: 'Clark', email: 'amelia.clark@minibank.io', balance: 1280.90, lastFour: '1198' },
    { firstName: 'Noah', lastName: 'Walker', email: 'noah.walker@minibank.io', balance: 4500.00, lastFour: '8854' },
    { firstName: 'Isla', lastName: 'Robinson', email: 'isla.robinson@minibank.io', balance: 620.45, lastFour: '2277' }
  ];

  const TX_TEMPLATES = [
    { desc: 'Rent', cat: 'bills', type: 'debit', min: 600, max: 1200 },
    { desc: 'Groceries', cat: 'groceries', type: 'debit', min: 15, max: 85 },
    { desc: 'Netflix', cat: 'entertainment', type: 'debit', min: 10, max: 16 },
    { desc: 'Spotify', cat: 'entertainment', type: 'debit', min: 10, max: 11 },
    { desc: 'Amazon', cat: 'entertainment', type: 'debit', min: 8, max: 100 },
    { desc: 'Gym membership', cat: 'bills', type: 'debit', min: 25, max: 50 },
    { desc: 'Coffee', cat: 'groceries', type: 'debit', min: 2, max: 6 },
    { desc: 'Takeaway', cat: 'groceries', type: 'debit', min: 12, max: 35 },
    { desc: 'Transport', cat: 'transport', type: 'debit', min: 2, max: 15 },
    { desc: 'Electricity bill', cat: 'bills', type: 'debit', min: 50, max: 120 },
    { desc: 'Phone bill', cat: 'bills', type: 'debit', min: 20, max: 45 },
    { desc: 'Online shopping', cat: 'entertainment', type: 'debit', min: 15, max: 80 },
    { desc: 'Salary', cat: 'income', type: 'credit', min: 2200, max: 3500 },
    { desc: 'Transfer received', cat: 'transfers', type: 'credit', min: 20, max: 200 },
    { desc: 'Refund', cat: 'transfers', type: 'credit', min: 5, max: 60 }
  ];

  const additionalAccountIds = [];

  for (const user of ADDITIONAL_USERS) {
    const userId = uuidv4();
    const accountId = uuidv4();
    additionalAccountIds.push(accountId);
    const accountNumber = String(Math.floor(10000000 + Math.random() * 90000000));

    await pool.query(
      'INSERT INTO users (id, first_name, last_name, email, password_hash) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING',
      [userId, user.firstName, user.lastName, user.email, passwordHash]
    );

    await pool.query(
      'INSERT INTO accounts (id, user_id, account_number, balance) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [accountId, userId, accountNumber, user.balance]
    );

    await pool.query(
      'INSERT INTO cards (user_id, last_four, holder_name, expiry) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [userId, user.lastFour, `${user.firstName} ${user.lastName}`.toUpperCase(), '12/28']
    );

    // Payees — link to other additional users
    const payeePool = ADDITIONAL_USERS.filter(u => u.email !== user.email);
    const p1 = payeePool[Math.floor(Math.random() * payeePool.length)];
    let p2 = payeePool[Math.floor(Math.random() * payeePool.length)];
    while (p2.email === p1.email) { p2 = payeePool[Math.floor(Math.random() * payeePool.length)]; }

    await pool.query(
      'INSERT INTO payees (user_id, name, sort_code, account_number) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [userId, `${p1.firstName} ${p1.lastName}`, '04-00-04', String(Math.floor(10000000 + Math.random() * 90000000))]
    );
    await pool.query(
      'INSERT INTO payees (user_id, name, sort_code, account_number) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [userId, `${p2.firstName} ${p2.lastName}`, '04-00-04', String(Math.floor(10000000 + Math.random() * 90000000))]
    );

    // 15 transactions per user spread across last 90 days
    for (let i = 0; i < 15; i++) {
      const t = TX_TEMPLATES[Math.floor(Math.random() * TX_TEMPLATES.length)];
      const amount = parseFloat((Math.random() * (t.max - t.min) + t.min).toFixed(2));
      const daysAgo = Math.floor(Math.random() * 90) + 1;

      await pool.query(
        `INSERT INTO transactions (from_account, amount, status, description, category, type, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${daysAgo} days' - INTERVAL '${Math.floor(Math.random() * 12)} hours')`,
        [accountId, amount, 'SUCCESS', t.desc, t.cat, t.type]
      );
    }

    console.log(`  ✓ ${user.firstName} ${user.lastName} (${user.email}) — £${user.balance.toFixed(2)}`);
  }

  // Seed some audit logs
  const severities = ['INFO', 'INFO', 'INFO', 'WARN', 'ERROR'];
  const actions = ['login', 'transfer', 'card_freeze', 'balance_check', 'failed_login'];
  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 7);
    const date = new Date(Date.now() - daysAgo * 86400000 - Math.random() * 86400000);
    const severity = severities[Math.floor(Math.random() * severities.length)];
    await pool.query(
      `INSERT INTO audit_logs (service_name, action, severity, message, correlation_id, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        ['auth-service', 'payment-service', 'account-service'][Math.floor(Math.random() * 3)],
        actions[Math.floor(Math.random() * actions.length)],
        severity,
        severity === 'ERROR' ? 'Operation failed' : 'Operation completed',
        uuidv4(),
        date.toISOString()
      ]
    );
  }

  console.log('\n✅ Seed complete. All users use password: password123');
  await pool.end();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
