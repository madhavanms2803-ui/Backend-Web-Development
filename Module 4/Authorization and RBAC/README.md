# LU 54 — Authorization & RBAC

Authentication is provided. This assignment adds authorization: role gates and ownership checks to close the Broken Object Level Authorization (IDOR) vulnerability.

## Setup

```bash
cp .env.example .env
npm install
npm test
npm start
```

## Authorization rules

- `DELETE /users/:id`: admin only.
- `POST /posts/:id/hide`: moderator or admin only.
- `PATCH /posts/:id` and `DELETE /posts/:id`: post owner, moderator, or admin.
- Missing posts return 404 before ownership is evaluated.
- Missing/invalid authentication returns 401; authenticated users without permission receive 403.

The role is read only from the verified `req.user.role`, never from client-controlled input. `requireAuth.js` remains unchanged. The store is in-memory; no database is used.

## IDOR fix

Test case #2 (member B editing member A's post) now returns 403 because the ownership check in `src/routes/posts.js` compares `post.authorId` with `req.user.id`. Member B is neither the owner nor a privileged role, so the handler rejects the request before changing the post.

## Tests

```bash
npm test
```
