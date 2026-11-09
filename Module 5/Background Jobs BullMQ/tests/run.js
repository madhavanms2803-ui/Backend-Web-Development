'use strict';

require('dotenv').config();

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

let generateOTP;
let storeOTP;
try {
  ({ generateOTP, storeOTP } = require('../src/otpStore'));
} catch (err) {
  console.error('Failed to import src/otpStore.js:', err.message);
  process.exit(1);
}

let emailQueue;
try {
  ({ emailQueue } = require('../src/queue'));
} catch (err) {
  console.error('Failed to import src/queue.js:', err.message);
  process.exit(1);
}

const http = require('node:http');
const { app } = require('../src/app');

let server;
const PORT = 3098;

async function startServer() {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(PORT, resolve);
  });
}

async function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  await startServer();

  const email = `test-${Date.now()}@example.com`;

  console.log('\nTest 1: POST /auth/request-verification returns 200');
  await test('Returns 200 with a message', async () => {
    const res = await request('POST', '/auth/request-verification', { email });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.message, `Expected a message field, got: ${JSON.stringify(res.body)}`);
  });

  console.log('\nTest 2: generateOTP produces a 6-digit numeric string');
  await test('generateOTP returns a 6-digit numeric string', async () => {
    const otp = generateOTP();
    assert(typeof otp === 'string', `Expected string, got ${typeof otp}`);
    assert(/^\\d{6}$/.test(otp), `Expected 6 digits, got '${otp}'`);
  });

  console.log('\nTest 3: POST /auth/verify-otp with correct OTP returns 200');
  await test('Correct OTP returns 200', async () => {
    const testEmail = `verify-${Date.now()}@example.com`;
    const otp = generateOTP();
    storeOTP(testEmail, otp);
    const res = await request('POST', '/auth/verify-otp', { email: testEmail, otp });
    assert(res.status === 200, `Expected 200, got ${res.status}. Body: ${JSON.stringify(res.body)}`);
  });

  console.log('\nTest 4: POST /auth/verify-otp with wrong OTP returns 401');
  await test('Wrong OTP returns 401', async () => {
    const testEmail = `wrong-${Date.now()}@example.com`;
    const otp = generateOTP();
    storeOTP(testEmail, otp);
    const res = await request('POST', '/auth/verify-otp', { email: testEmail, otp: '000000' });
    assert(res.status === 401, `Expected 401, got ${res.status}. Body: ${JSON.stringify(res.body)}`);
  });

  console.log('\nTest 5: After 3 wrong OTP attempts, returns 429');
  await test('3 wrong attempts → 429 Too Many Requests', async () => {
    const testEmail = `limit-${Date.now()}@example.com`;
    const otp = generateOTP();
    storeOTP(testEmail, otp);
    for (let i = 0; i < 3; i++) {
      await request('POST', '/auth/verify-otp', { email: testEmail, otp: '000000' });
    }
    const res = await request('POST', '/auth/verify-otp', { email: testEmail, otp });
    assert(res.status === 429, `Expected 429 after 3 wrong attempts, got ${res.status}. Body: ${JSON.stringify(res.body)}`);
  });

  console.log('\nTest 6: Expired OTP returns 410');
  await test('Expired OTP returns 410 Gone', async () => {
    const testEmail = `expired-${Date.now()}@example.com`;
    const otp = generateOTP();
    storeOTP(testEmail, otp);
    const otpStore = require('../src/otpStore');
    const entry = otpStore._store.get(testEmail);
    if (entry) entry.expiresAt = Date.now() - 1000;

    const res = await request('POST', '/auth/verify-otp', { email: testEmail, otp });
    assert(res.status === 410, `Expected 410 for expired OTP, got ${res.status}. Body: ${JSON.stringify(res.body)}`);
  });

  await new Promise((resolve) => server.close(resolve));
  try { await emailQueue?.close(); } catch {}

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed === 0) console.log('All tests passed! ✓');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
