const { Router } = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createUser, findUserByEmail } = require('../data/store');
const { writeAudit } = require('../data/store');
const { JWT_SECRET } = require('../middleware/auth');
const { logger } = require('../observability/logger');
const { metrics } = require('../observability/metrics');

const router = Router();

router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Validation error', message: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Validation error', message: 'Password must be at least 6 characters' });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Conflict', message: 'An account with this email already exists' });
    }

    const [firstName, ...rest] = name.split(' ');
    const lastName = rest.join(' ') || 'User';
    const user = await createUser(firstName, lastName, email, password);

    const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, { expiresIn: '24h' });
    logger.info('auth-service', 'POST /api/signup', 'User registered', { user_id: user.id });
    await writeAudit({ serviceName: 'auth-service', action: 'signup', severity: 'INFO', message: `New user registered: ${email}`, correlationId: req.correlationId, userId: user.id });

    res.status(201).json({ token, user: { id: user.id, name: `${firstName} ${lastName}`, email } });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Validation error', message: 'Email and password are required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      logger.warn('auth-service', 'POST /api/login', 'Failed login — user not found', { email });
      metrics.recordLoginFailure();
      await writeAudit({ serviceName: 'auth-service', action: 'failed_login', severity: 'WARN', message: `Failed login for ${email} — not found`, correlationId: req.correlationId });
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      logger.warn('auth-service', 'POST /api/login', 'Failed login — wrong password', { email, user_id: user.id });
      metrics.recordLoginFailure();
      await writeAudit({ serviceName: 'auth-service', action: 'failed_login', severity: 'WARN', message: `Failed login for ${email} — wrong password`, correlationId: req.correlationId, userId: user.id });
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    logger.info('auth-service', 'POST /api/login', 'User logged in', { user_id: user.id });
    await writeAudit({ serviceName: 'auth-service', action: 'login', severity: 'INFO', message: `User logged in: ${email}`, correlationId: req.correlationId, userId: user.id });

    res.json({ token, user: { id: user.id, name: `${user.first_name} ${user.last_name}`, email: user.email } });
  } catch (err) { next(err); }
});

router.post('/logout', (req, res) => {
  logger.info('auth-service', 'POST /api/logout', 'User logged out');
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
