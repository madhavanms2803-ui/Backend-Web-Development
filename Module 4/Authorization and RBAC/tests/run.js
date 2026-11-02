require('dotenv').config();
process.env.ACCESS_SECRET =
  process.env.ACCESS_SECRET || 'lu54-test-secret-do-not-use-in-production-32chars';

const http = require('http');
const jwt = require('jsonwebtoken');
const SECRET = process.env.ACCESS_SECRET;
const token = (sub, role) => jwt.sign({ sub, role }, SECRET, { algorithm: 'HS256', expiresIn: '1h' });

const originalLog = console.log;
console.log = () => {};
const app = require('../src/app');
console.log = originalLog;
const server = http.createServer(app);

function request(server, options, body) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const req = http.request({
      hostname: '127.0.0.1',
      port: addr ? addr.port : 0,
      path: options.path || '/',
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let passed = 0;
let failed = 0;
function assert(condition, message) {
  if (condition) { console.log(`  ✓ ${message}`); passed++; }
  else { console.log(`  ✗ ${message}`); failed++; }
}

function as(role, sub, method, path, body) {
  return request(server, {
    method, path,
    headers: { Authorization: `Bearer ${token(sub, role)}`, 'Content-Type': 'application/json' },
  }, body);
}

async function runTests() {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  console.log('\nAuthorization & RBAC Tests\n');

  console.log('Test 1: Owner edits own post → 200');
  { const res = await as('member', 'u-A', 'PATCH', '/posts/1', { title: 'mine' }); assert(res.status === 200, `Status 200 (got ${res.status})`); }

  console.log('\nTest 2: Member B edits member A post → 403 (IDOR closed)');
  { const res = await as('member', 'u-B', 'PATCH', '/posts/1', { title: 'hacked' }); assert(res.status === 403, `Status 403 (got ${res.status})`); assert(res.body?.error?.code === 'FORBIDDEN', `error.code FORBIDDEN (got ${res.body?.error?.code})`); }

  console.log('\nTest 3: Moderator deletes any post → 200');
  { const res = await as('moderator', 'u-mod', 'DELETE', '/posts/2'); assert(res.status === 200, `Status 200 (got ${res.status})`); }

  console.log('\nTest 4: Member hides a post → 403');
  { const res = await as('member', 'u-A', 'POST', '/posts/1/hide'); assert(res.status === 403, `Status 403 (got ${res.status})`); assert(res.body?.error?.code === 'FORBIDDEN', `error.code FORBIDDEN (got ${res.body?.error?.code})`); }

  console.log('\nTest 5: Moderator hides a post → 200');
  { const res = await as('moderator', 'u-mod', 'POST', '/posts/1/hide'); assert(res.status === 200, `Status 200 (got ${res.status})`); }

  console.log('\nTest 6: Member calls admin-only delete → 403');
  { const res = await as('member', 'u-B', 'DELETE', '/users/u-A'); assert(res.status === 403, `Status 403 (got ${res.status})`); assert(res.body?.error?.code === 'FORBIDDEN', `error.code FORBIDDEN (got ${res.body?.error?.code})`); }

  console.log('\nTest 7: Admin deletes a user → 200');
  { const res = await as('admin', 'u-admin', 'DELETE', '/users/u-A'); assert(res.status === 200, `Status 200 (got ${res.status})`); }

  console.log('\nTest 8: Missing post returns 404');
  { const res = await as('member', 'u-A', 'PATCH', '/posts/999', { title: 'x' }); assert(res.status === 404, `Status 404 (got ${res.status})`); }

  console.log('\nTest 9: No token on protected route → 401');
  { const res = await request(server, { path: '/posts' }); assert(res.status === 401, `Status 401 (got ${res.status})`); }

  server.close();
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) { console.log('\nSome tests failed.'); process.exit(1); }
  else console.log('\nAll tests passed! ✓');
}

runTests().catch((err) => { console.error('Test runner error:', err.message); process.exit(1); });
