# Authentication Middleware

This assignment implements an Express `requireAuth` middleware that verifies JWTs before protected route handlers run.

## Run locally

```bash
npm install
cp .env.example .env
npm start
```

Use a non-production secret in `.env`; never commit real credentials.

## Routes

- `POST /auth/login` — public development endpoint that returns an HS256 token.
- `GET /profile` — protected; returns the verified JWT payload.
- `GET /posts/my` — protected; scopes the example response to `req.user.sub`.
- `POST /posts` — protected; returns a created example post.

## Middleware contract

- Extracts only a strict `Bearer <token>` header.
- Rejects missing, wrong-scheme, or empty tokens with HTTP 401.
- Verifies with `jwt.verify`, the environment-provided `JWT_SECRET`, and `algorithms: ['HS256']`.
- Sets `req.user` only after successful verification, then calls `next()`.
- Returns the exact same generic JSON body for extraction and verification failures:
  `{ "error": { "code": "AUTH_REQUIRED", "message": "Authentication required" } }`.

## Manual checks

1. Call `GET /profile` without an Authorization header: expect 401 and the generic body.
2. Send `Authorization: Basic abc`: expect the same 401 body.
3. Send `Authorization: Bearer not-a-jwt`: expect the same 401 body.
4. Call `POST /auth/login`, copy `accessToken`, and send it as `Authorization: Bearer <accessToken>` to `GET /profile`: expect 200 and a verified `user` payload.
