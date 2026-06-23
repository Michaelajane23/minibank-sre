const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getAccount, findUserById } = require('../data/store');

const router = Router();

router.get('/account', authMiddleware, async (req, res, next) => {
  try {
    const account = await getAccount(req.userId);
    const user = await findUserById(req.userId);

    if (!account) {
      return res.status(404).json({ error: 'Not found', message: 'Account not found' });
    }

    res.json({
      id: account.id,
      userId: account.user_id,
      accountNumber: account.account_number,
      sortCode: account.sort_code,
      balance: parseFloat(account.balance),
      available: parseFloat(account.balance),
      currency: 'GBP',
      status: account.status,
      user: user ? { id: user.id, name: `${user.first_name} ${user.last_name}`, email: user.email } : null
    });
  } catch (err) { next(err); }
});

module.exports = router;
