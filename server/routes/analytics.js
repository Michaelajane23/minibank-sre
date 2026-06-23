const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getAccount } = require('../data/store');
const { query } = require('../database/pool');

const router = Router();

router.get('/analytics', authMiddleware, async (req, res, next) => {
  try {
    const account = await getAccount(req.userId);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    // Spending by category this month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const catResult = await query(
      `SELECT category, SUM(amount) as total FROM transactions
       WHERE from_account = $1 AND type = 'debit' AND created_at >= $2 AND status = 'SUCCESS'
       GROUP BY category`,
      [account.id, startOfMonth]
    );

    const spending = {};
    catResult.rows.forEach(r => { spending[r.category] = parseFloat(r.total); });

    // Monthly totals (last 6 months)
    const monthlyResult = await query(
      `SELECT TO_CHAR(created_at, 'Mon') as month, SUM(amount) as total
       FROM transactions
       WHERE from_account = $1 AND type = 'debit' AND status = 'SUCCESS' AND created_at >= NOW() - INTERVAL '6 months'
       GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
       ORDER BY DATE_TRUNC('month', created_at)`,
      [account.id]
    );

    const monthly = monthlyResult.rows.map(r => ({ month: r.month, total: parseFloat(r.total) }));

    res.json({ spending, monthly });
  } catch (err) { next(err); }
});

module.exports = router;
