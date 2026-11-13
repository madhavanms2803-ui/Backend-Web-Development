'use strict';

// ─── GIVEN FILE — modify only to add caching (do not remove existing code) ───
// This file sets up the Express app and two routes.
// Your job: import cacheGet/cacheSet/cacheDel from ./cache and wire up:
//   GET /feed  → cache-aside with 60s TTL and X-Cache header
//   POST /posts → cacheDel after db.createPost()

require('dotenv').config();

const express = require('express');
const db      = require('./db');
const { cacheGet, cacheSet, cacheDel } = require('./cache');

const app = express();
app.use(express.json());

const FEED_KEY = 'feed:trending';
const FEED_TTL = 60;   // seconds

app.get('/health', (req, res) => res.json({ ok: true }));

// GET /feed — cache-aside: serve a cached result or load and populate it.
app.get('/feed', async (req, res) => {
  try {
    const t0 = Date.now();
    const cachedPosts = await cacheGet(FEED_KEY);

    if (cachedPosts !== null) {
      const elapsedMs = Date.now() - t0;
      console.log(`[feed] HIT ${elapsedMs}ms`);
      return res.set('X-Cache', 'HIT').json(cachedPosts);
    }

    const posts = await db.getTrendingPosts();
    await cacheSet(FEED_KEY, posts, FEED_TTL);

    const elapsedMs = Date.now() - t0;
    console.log(`[feed] MISS ${elapsedMs}ms`);
    return res.set('X-Cache', 'MISS').json(posts);
  } catch (err) {
    console.error('[feed] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /posts — create a post, then invalidate the cached trending feed.
app.post('/posts', async (req, res) => {
  try {
    const post = await db.createPost(req.body);
    await cacheDel(FEED_KEY);
    return res.status(201).json(post);
  } catch (err) {
    console.error('[posts] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
}

module.exports = { app };
