const express = require('express');
const { signToken } = require('./utils/jwt');
const requireAuth = require('./middleware/requireAuth');

const app = express();
app.use(express.json());

// Public endpoint: issues a development token for the assignment.
app.post('/auth/login', (req, res) => {
  const userId = String(req.body?.sub ?? '7');
  const token = signToken({ sub: userId });
  return res.json({ accessToken: token });
});

// Protected endpoints: identity is available only after requireAuth verifies it.
app.get('/profile', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

app.get('/posts/my', requireAuth, (req, res) => {
  return res.json({ userId: req.user.sub, posts: [] });
});

app.post('/posts', requireAuth, (req, res) => {
  return res.status(201).json({ userId: req.user.sub, post: req.body });
});

module.exports = app;
