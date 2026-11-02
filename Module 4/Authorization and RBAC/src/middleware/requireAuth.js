// GIVEN — do not modify. Verifies the Bearer token and sets req.user.
const jwt = require('jsonwebtoken');

module.exports = function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization ?? '';
  const match = /^Bearer ([^\\s]+)$/i.exec(authHeader);
  const token = match ? match[1] : null;

  if (!token) {
    return res
      .status(401)
      .json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
  }

  try {
    const payload = jwt.verify(token, process.env.ACCESS_SECRET, {
      algorithms: ['HS256'],
    });
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (_error) {
    return res
      .status(401)
      .json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
  }
};
