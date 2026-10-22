const express = require('express');
const bcrypt = require('bcryptjs');
const users = require('../repositories/userRepository');
const sessionStore = require('../session/sessionStore');
const requireSession = require('../middleware/requireSession');
const { cookieOptions, clearCookieOptions } = require('../config/cookieOptions');

const router = express.Router();

function authRequired(res) {
  return res.status(401).json({
    error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
  });
}

router.post('/login', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string'
      ? req.body.password : '';

    if (!email || !password || password.length > 1024) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Valid email and password are required' },
      });
    }

    const user = await users.findByEmail(email);
    const valid = user
      ? await bcrypt.compare(password, user.passwordHash)
      : await bcrypt.compare(password, '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');

    if (!user || !valid) return authRequired(res);

    const session = sessionStore.create(user.id);
    res.cookie('sid', session.id, cookieOptions);

    return res.status(200).json({
      data: { id: user.id, name: user.name, email: user.email },
    });
  } catch {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

router.get('/me', requireSession, (req, res) => {
  res.status(200).json({ data: req.user });
});

router.post('/logout', (req, res) => {
  const sid = req.signedCookies && req.signedCookies.sid;
  if (typeof sid === 'string') sessionStore.destroy(sid);

  res.clearCookie('sid', clearCookieOptions);
  return res.status(204).send();
});

module.exports = router;
