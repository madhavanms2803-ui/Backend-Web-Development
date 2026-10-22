const secure = process.env.COOKIE_SECURE === 'true';

const cookieOptions = {
  httpOnly: true,
  secure,
  sameSite: 'lax',
  signed: true,
  path: '/',
  maxAge: Math.max(60_000, Number(process.env.SESSION_TTL_MS) || 3_600_000),
};

module.exports = { cookieOptions, clearCookieOptions: { ...cookieOptions, maxAge: undefined } };
