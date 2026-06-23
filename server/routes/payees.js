const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getPayees, addPayee, updatePayee, deletePayee } = require('../data/store');

const router = Router();

router.get('/payees', authMiddleware, async (req, res, next) => {
  try {
    const payees = await getPayees(req.userId);
    const mapped = payees.map(p => ({ id: p.id, name: p.name, sortCode: p.sort_code, accountNumber: p.account_number }));
    res.json({ payees: mapped });
  } catch (err) { next(err); }
});

router.post('/payees', authMiddleware, async (req, res, next) => {
  try {
    const { name, sortCode, accountNumber } = req.body;
    if (!name || !sortCode || !accountNumber) {
      return res.status(400).json({ error: 'Validation error', message: 'Name, sort code, and account number are required' });
    }
    const payee = await addPayee(req.userId, { name, sortCode, accountNumber });
    res.status(201).json({ payee: { id: payee.id, name: payee.name, sortCode: payee.sort_code, accountNumber: payee.account_number } });
  } catch (err) { next(err); }
});

router.put('/payees/:id', authMiddleware, async (req, res, next) => {
  try {
    const { name, sortCode, accountNumber } = req.body;
    const payee = await updatePayee(req.userId, req.params.id, { name, sortCode, accountNumber });
    if (!payee) return res.status(404).json({ error: 'Payee not found' });
    res.json({ payee: { id: payee.id, name: payee.name, sortCode: payee.sort_code, accountNumber: payee.account_number } });
  } catch (err) { next(err); }
});

router.delete('/payees/:id', authMiddleware, async (req, res, next) => {
  try {
    await deletePayee(req.userId, req.params.id);
    res.json({ message: 'Payee deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
