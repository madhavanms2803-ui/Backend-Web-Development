'use strict';

const crypto = require('node:crypto');
const { handleEvent } = require('./eventHandlers');

const _processedIds = new Set();

function hasValidSignature(rawBody, signatureHeader) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || typeof signatureHeader !== 'string' || !Buffer.isBuffer(rawBody)) {
    return false;
  }

  const match = /^sha256=([a-f0-9]{64})$/i.exec(signatureHeader);
  if (!match) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest();

  const received = Buffer.from(match[1], 'hex');

  return received.length === expected.length &&
    crypto.timingSafeEqual(expected, received);
}

async function handleWebhook(req, res) {
  const signature = req.headers['x-webhook-signature'];

  if (!hasValidSignature(req.body, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  if (!event || typeof event.id !== 'string' || event.id.length === 0) {
    return res.status(400).json({ error: 'Missing event id' });
  }

  if (_processedIds.has(event.id)) {
    return res.status(200).json({ status: 'already_processed' });
  }

  // Mark first so retries cannot trigger the side effect a second time.
  _processedIds.add(event.id);

  // Acknowledge the provider before running any potentially slow work.
  res.status(200).json({ status: 'received' });

  setImmediate(() => {
    Promise.resolve(handleEvent(event)).catch((error) => {
      console.error(`[webhook] Failed to process event ${event.id}:`, error);
    });
  });
}

module.exports = { handleWebhook, _processedIds };
