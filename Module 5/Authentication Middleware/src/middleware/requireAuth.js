const jwt = require('jsonwebtoken');

const AUTH_REQUIRED = {
  error: {
    code: 'AUTH_REQUIRED',
    message: 'Authentication required',
  },
};

module.exports = function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization ?? '';
  const match = /^Bearer ([^\s]+)$/i.exec(authHeader);
  const token = match ? match[1] : null;

  if (!token) {
    return res.status(401).json(AUTH_REQUIRED);
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });

    req.user = payload;
    return next();
  } catch (_error) {
    return res.status(401).json(AUTH_REQUIRED);
  }
};
