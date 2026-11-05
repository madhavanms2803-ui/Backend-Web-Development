'use strict';
// routes/payments.js
// Idempotent payment creation: one real charge per Idempotency-Key.

const router = require('express').Router();
const { charges, idempotency, nextChargeId } = require('../store');

router.post('/', (req, res) => {
  const key = req.headers['idempotency-key'];

  // A request without a key cannot be safely deduplicated.
  if (!key) {
    return res.status(400).json({
      error: {
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'Idempotency-Key header is required',
      },
    });
  }

  // Replay the exact status and body for a previously processed operation.
  if (idempotency.has(key)) {
    const saved = idempotency.get(key);
    return res.status(saved.status).json(saved.body);
  }

  // A new key represents a new payment operation.
  const amount = req.body && req.body.amount;
  const charge = {
    id: nextChargeId(),
    amount,
    status: 'charged',
  };
  charges.push(charge);

  const status = 201;
  const body = {
    id: charge.id,
    amount: charge.amount,
    status: charge.status,
  };

  // Cache the complete response so retries receive the identical result.
  idempotency.set(key, { status, body });

  return res.status(status).json(body);
});

module.exports = router;
