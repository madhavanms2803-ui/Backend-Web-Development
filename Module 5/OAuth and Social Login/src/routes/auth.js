'use strict';
// routes/auth.js — OAuth entry points

const router = require('express').Router();
const { passport } = require('../auth/passport');
const { signToken } = require('../utils/jwt');

// Start the Google authorization-code flow.
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['openid', 'email', 'profile'],
    session: false,
  }),
);

// Passport exchanges the code and populates req.user via verifyCallback.
// Issue a Threadbase JWT; Google's access token is for Google APIs only.
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/auth/failure',
  }),
  (req, res) => {
    const token = signToken({ sub: req.user.id, role: req.user.role });
    return res.json({ token });
  },
);

router.get('/failure', (_req, res) => {
  res.status(401).json({
    error: {
      code: 'OAUTH_FAILED',
      message: 'Google login failed or was denied',
    },
  });
});

module.exports = router;
