const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getPots, createPot, getPot, updatePotBalance, deletePot, getAccount, updateBalance } = require('../data/store');
const { logger } = require('../observability/logger');

const router = Router();

router.get('/pots', authMiddleware, async (req, res, next) => {
  try {
    const pots = await getPots(req.userId);
    const mapped = pots.map(p => ({ id: p.id, name: p.name, balance: parseFloat(p.balance), goal: parseFloat(p.goal_amount) }));
    res.json({ pots: mapped });
  } catch (err) { next(err); }
});

router.post('/pots', authMiddleware, async (req, res, next) => {
  try {
    const { name, goal } = req.body;
    if (!name) return res.status(400).json({ error: 'Validation error', message: 'Name is required' });
    const pot = await createPot(req.userId, { name, goal: goal || 0 });
    res.status(201).json({ pot: { id: pot.id, name: pot.name, balance: parseFloat(pot.balance), goal: parseFloat(pot.goal_amount) } });
  } catch (err) { next(err); }
});

router.post('/pots/:id/deposit', authMiddleware, async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const account = await getAccount(req.userId);
    if (account.status === 'restricted') {
      return res.status(403).json({ error: 'Account restricted', message: 'Your account is under review.' });
    }
    const balance = parseFloat(account.balance);
    if (balance < amount) return res.status(422).json({ error: 'Insufficient funds' });

    const pot = await getPot(req.userId, req.params.id);
    if (!pot) return res.status(404).json({ error: 'Pot not found' });

    await updateBalance(account.id, balance - amount);
    await updatePotBalance(pot.id, parseFloat(pot.balance) + amount);

    const updated = await getPot(req.userId, req.params.id);
    const updatedAccount = await getAccount(req.userId);
    logger.info('savings-service', `POST /api/pots/${req.params.id}/deposit`, 'Pot deposit', { user_id: req.userId, pot: pot.name, amount });
    res.json({ pot: { id: updated.id, name: updated.name, balance: parseFloat(updated.balance), goal: parseFloat(updated.goal_amount) }, newBalance: parseFloat(updatedAccount.balance) });
  } catch (err) { next(err); }
});

router.post('/pots/:id/withdraw', authMiddleware, async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const pot = await getPot(req.userId, req.params.id);
    if (!pot) return res.status(404).json({ error: 'Pot not found' });
    const potBalance = parseFloat(pot.balance);
    if (potBalance < amount) return res.status(422).json({ error: 'Insufficient pot balance' });

    const account = await getAccount(req.userId);
    await updatePotBalance(pot.id, potBalance - amount);
    await updateBalance(account.id, parseFloat(account.balance) + amount);

    const updated = await getPot(req.userId, req.params.id);
    const updatedAccount = await getAccount(req.userId);
    logger.info('savings-service', `POST /api/pots/${req.params.id}/withdraw`, 'Pot withdrawal', { user_id: req.userId, pot: pot.name, amount });
    res.json({ pot: { id: updated.id, name: updated.name, balance: parseFloat(updated.balance), goal: parseFloat(updated.goal_amount) }, newBalance: parseFloat(updatedAccount.balance) });
  } catch (err) { next(err); }
});

router.delete('/pots/:id', authMiddleware, async (req, res, next) => {
  try {
    const pot = await deletePot(req.userId, req.params.id);
    if (!pot) return res.status(404).json({ error: 'Pot not found' });
    const potBalance = parseFloat(pot.balance);
    if (potBalance > 0) {
      const account = await getAccount(req.userId);
      await updateBalance(account.id, parseFloat(account.balance) + potBalance);
    }
    res.json({ message: 'Pot deleted', returnedToBalance: potBalance });
  } catch (err) { next(err); }
});

module.exports = router;
