'use strict';

const rateLimit = require('express-rate-limit');

const WINDOW_MS = 15 * 60 * 1000;

module.exports = rateLimit({
  windowMs: WINDOW_MS,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res, _next, options) => {
    // express-rate-limit's MemoryStore exposes the current window reset time.
    // Use it to tell the client how many seconds to wait; the fallback keeps
    // Retry-After valid if a custom store does not provide resetTime.
    const resetTime = req.rateLimit && req.rateLimit.resetTime;
    const retryAfterSeconds = resetTime instanceof Date
      ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
      : Math.ceil(options.windowMs / 1000);

    res.setHeader('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      error: 'Too many requests, please try again later.',
    });
  },
});

/*
 * Multi-instance production note:
 * The default MemoryStore keeps counters inside one Node.js process. Behind a
 * load balancer, each app instance therefore sees a separate counter, allowing
 * a client whose requests are distributed across N instances to effectively
 * receive N times the configured limit. A Redis-backed store from the
 * rate-limit-redis package replaces that local store with a shared Redis
 * counter so every instance reads and updates the same rate-limit state.
 * Configure the Redis client and pass a RedisStore through the "store" option
 * when deploying multiple instances.
 */
