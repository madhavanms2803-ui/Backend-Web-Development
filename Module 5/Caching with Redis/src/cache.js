'use strict';

const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('[cache] Redis connection error:', err.message);
});

// Return parsed cached data, or null when the key is absent or Redis is unavailable.
async function cacheGet(key) {
  try {
    const value = await redis.get(key);
    return value === null ? null : JSON.parse(value);
  } catch (err) {
    console.error('[cache] GET failed:', err.message);
    return null;
  }
}

// Store JSON with an expiry so stale values cannot live forever.
async function cacheSet(key, data, ttlSeconds) {
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } catch (err) {
    console.error('[cache] SET failed:', err.message);
  }
}

// Invalidate a cached value after the underlying data changes.
async function cacheDel(key) {
  try {
    await redis.del(key);
  } catch (err) {
    console.error('[cache] DEL failed:', err.message);
  }
}

module.exports = { cacheGet, cacheSet, cacheDel };
