const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getAccount, getTransactions } = require('../data/store');

const router = Router();

router.get('/transactions', authMiddleware, async (req, res, next) => {
  try {
    const account = await getAccount(req.userId);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const category = req.query.category || null;
    const search = req.query.search || null;

    const result = await getTransactions(account.id, { limit, offset, category, search });

    // Map DB rows to frontend format
    const transactions = result.transactions.map(tx => ({
      id: tx.id,
      description: tx.description || 'Transfer',
      category: tx.category || 'transfers',
      amount: parseFloat(tx.amount),
      type: tx.type || 'debit',
      status: tx.status,
      date: tx.created_at,
      reference: tx.reference
    }));

    res.json({
      transactions,
      pagination: { total: result.total, limit, offset, hasMore: offset + limit < result.total }
    });
  } catch (err) { next(err); }
});

module.exports = router;
