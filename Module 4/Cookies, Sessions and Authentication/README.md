# Cookies, Sessions and Authentication

Express and Prisma API implementing signed-cookie, server-side session authentication.

## Setup

Requirements: Node.js and npm.

1. Run `npm install`.
2. Copy `.env.example` to `.env`.
3. Set `COOKIE_SECRET` to a random secret of at least 32 characters.
4. Run `npm run setup`.
5. Start the server with `npm run dev`.

Generate a secret with:
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Demo credentials: `sam@example.com` / `SessionDemo!48`.

## Endpoints

- `POST /auth/login`: verifies credentials and sets a signed `sid` cookie.
- `GET /auth/me`: returns safe identity fields for a valid session.
- `POST /auth/logout`: destroys the server-side session and clears the cookie; returns `204`.

## Verification

Login and save the cookie:
`curl -i -c /tmp/session-cookies.txt -H 'Content-Type: application/json' -d '{"email":"sam@example.com","password":"SessionDemo!48"}' http://localhost:3000/auth/login`

Test identity:
`curl -i -b /tmp/session-cookies.txt http://localhost:3000/auth/me`

Test missing or tampered cookies: expect `401 Unauthorized`.

Logout:
`curl -i -b /tmp/session-cookies.txt -X POST http://localhost:3000/auth/logout`

Replay the old cookie after logout: expect `401 Unauthorized`.

## Security

- Cookies contain only an opaque session ID, never credentials or user records.
- Passwords are checked with asynchronous bcrypt comparison.
- Cookie settings include `HttpOnly`, `SameSite=Lax`, signing, expiry, and configurable `Secure`.
- Use `COOKIE_SECURE=true` behind HTTPS in production; use `false` for local HTTP testing.
- The in-memory session store is for learning/local use. Production requires a shared expiring store such as Redis.
- Never commit `.env` or real secrets.
