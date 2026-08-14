# API_SPEC

Frozen HTTP interface. Request/response bodies have a Zod schema in
`packages/shared/src/schemas/`; the route validates with it and the web client infers from it.

Envelope (all endpoints): `{ success: true, data }` or `{ success: false, error, code? }`.

## 1. Auth — wallet challenge/response (D-001)

| Method | Path | Body | Response |
|--------|------|------|----------|
| `POST` | `/auth/challenge` | `{ address }` | `{ nonce }` — the exact string to sign |
| `POST` | `/auth/verify` | `{ address, signature }` | `{ address }` + sets `sa_session` cookie |
| `POST` | `/auth/logout` | — | `204`, clears the cookie |
| `GET` | `/auth/me` | — (cookie) | `{ address }`, `401` without a session |

Flow:

1. `POST /auth/challenge` — the server persists a single-use `Nonce` (5 min TTL) and returns
   the full human-readable message.
2. The browser calls Freighter `signMessage(nonce)`. Freighter SEP-53-frames and SHA-256s the
   message before signing; the signature comes back base64.
3. `POST /auth/verify` — the server verifies the Ed25519 signature, marks the nonce used, and
   sets an HTTP-only JWT cookie (`jose`, HS256, 7 days).

Roles and entitlements are **never** stored in the token — simulate them from the contract on
each request (`src/lib/soroban.ts`).

## 2. Health

| Method | Path | Response |
|--------|------|----------|
| `GET` | `/health` | liveness payload |

## 3. Domain endpoints

_TBD — depends on the product idea. Add a section per domain, schema first._

## 4. Database

`packages/api/prisma/schema.prisma`. Currently just `Nonce`. The chain is the authority on
money and entitlement; Postgres is a filing cabinet (D-003).

## 5. Environment

See `packages/api/.env.example` and `packages/web/.env.example`. Contract ids are empty until
`make deploy` prints them.
