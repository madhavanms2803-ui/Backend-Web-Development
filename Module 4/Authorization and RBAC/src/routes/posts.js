const express = require('express');
const { posts } = require('../data');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
const PRIVILEGED_ROLES = ['moderator', 'admin'];

function findOwnedOrPrivilegedPost(req, res) {
  const post = posts.find((item) => item.id === req.params.id);

  if (!post) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
    return null;
  }

  const isOwner = post.authorId === req.user.id;
  const isPrivileged = PRIVILEGED_ROLES.includes(req.user.role);

  if (!isOwner && !isPrivileged) {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'You are not allowed to modify this post' },
    });
    return null;
  }

  return post;
}

router.get('/', (req, res) => res.status(200).json(posts));

router.post('/', (req, res) => {
  const post = {
    id: String(posts.length + 1),
    authorId: req.user.id,
    title: req.body?.title ?? 'Untitled',
    hidden: false,
  };
  posts.push(post);
  return res.status(201).json(post);
});

router.patch('/:id', (req, res) => {
  const post = findOwnedOrPrivilegedPost(req, res);
  if (!post) return;

  post.title = req.body?.title ?? post.title;
  return res.status(200).json(post);
});

router.delete('/:id', (req, res) => {
  const post = findOwnedOrPrivilegedPost(req, res);
  if (!post) return;

  const index = posts.findIndex((item) => item.id === req.params.id);
  posts.splice(index, 1);
  return res.status(200).json({ ok: true });
});

router.post('/:id/hide', requireRole('moderator', 'admin'), (req, res) => {
  const post = posts.find((item) => item.id === req.params.id);
  if (!post) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
  }
  post.hidden = true;
  return res.status(200).json(post);
});

module.exports = router;
