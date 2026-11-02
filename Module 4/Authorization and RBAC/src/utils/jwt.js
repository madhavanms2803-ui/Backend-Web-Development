const jwt = require('jsonwebtoken');

const SECRET = process.env.ACCESS_SECRET;
const ALGORITHM = 'HS256';

function signToken(sub, role, expiresIn = '1h') {
  return jwt.sign({ sub, role }, SECRET, { algorithm: ALGORITHM, expiresIn });
}

module.exports = { signToken };
