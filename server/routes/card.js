const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getCard, updateCard, getAccount, writeAudit } = require('../data/store');
const { logger } = require('../observability/logger');
const { metrics } = require('../observability/metrics');

const router = Router();

router.get('/card', authMiddleware, async (req, res, next) => {
  try {
    const card = await getCard(req.userId);
    if (!card) return res.status(404).json({ error: 'No card found' });
    res.json({ card: { id: card.id, lastFour: card.last_four, holderName: card.holder_name, expiry: card.expiry, status: card.status, type: card.card_type } });
  } catch (err) { next(err); }
});

router.post('/card/freeze', authMiddleware, async (req, res, next) => {
  try {
    const card = await getCard(req.userId);
    if (!card) return res.status(404).json({ error: 'No card found' });

    const account = await getAccount(req.userId);
    if (account?.status === 'restricted') {
      logger.error('account-service', 'POST /api/card/freeze', 'Card action blocked — account restricted', { user_id: req.userId });
      return res.status(403).json({ error: 'Account restricted', message: 'Your account is under review.' });
    }
    if (card.status === 'frozen') return res.status(400).json({ error: 'Card is already frozen' });
    if (card.status === 'blocked') return res.status(400).json({ error: 'Card is permanently blocked' });

    await updateCard(req.userId, { status: 'frozen' });
    metrics.recordCardFreeze();
    logger.info('account-service', 'POST /api/card/freeze', 'Card frozen', { user_id: req.userId });
    await writeAudit({ serviceName: 'account-service', action: 'card_freeze', severity: 'INFO', message: 'Card frozen by user', correlationId: req.correlationId, userId: req.userId });

    const updated = await getCard(req.userId);
    res.json({ card: { id: updated.id, lastFour: updated.last_four, holderName: updated.holder_name, expiry: updated.expiry, status: updated.status, type: updated.card_type }, message: 'Card frozen successfully' });
  } catch (err) { next(err); }
});

router.post('/card/unfreeze', authMiddleware, async (req, res, next) => {
  try {
    const card = await getCard(req.userId);
    if (!card) return res.status(404).json({ error: 'No card found' });

    const account = await getAccount(req.userId);
    if (account?.status === 'restricted') {
      return res.status(403).json({ error: 'Account restricted', message: 'Your account is under review.' });
    }
    if (card.status !== 'frozen') return res.status(400).json({ error: 'Card is not frozen' });

    await updateCard(req.userId, { status: 'active' });
    logger.info('account-service', 'POST /api/card/unfreeze', 'Card unfrozen', { user_id: req.userId });
    await writeAudit({ serviceName: 'account-service', action: 'card_unfreeze', severity: 'INFO', message: 'Card unfrozen by user', correlationId: req.correlationId, userId: req.userId });

    const updated = await getCard(req.userId);
    res.json({ card: { id: updated.id, lastFour: updated.last_four, holderName: updated.holder_name, expiry: updated.expiry, status: updated.status, type: updated.card_type }, message: 'Card unfrozen' });
  } catch (err) { next(err); }
});

router.post('/card/replace', authMiddleware, async (req, res, next) => {
  try {
    await updateCard(req.userId, { status: 'active', last_four: String(Math.floor(1000 + Math.random() * 9000)), expiry: '06/29' });
    logger.info('account-service', 'POST /api/card/replace', 'Card replaced', { user_id: req.userId });
    await writeAudit({ serviceName: 'account-service', action: 'card_replace', severity: 'INFO', message: 'Replacement card issued', correlationId: req.correlationId, userId: req.userId });

    const updated = await getCard(req.userId);
    res.json({ card: { id: updated.id, lastFour: updated.last_four, holderName: updated.holder_name, expiry: updated.expiry, status: updated.status, type: updated.card_type }, message: 'Replacement card issued' });
  } catch (err) { next(err); }
});

module.exports = router;
