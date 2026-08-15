# DEPLOY

## Frontend on Vercel

This is a pnpm workspace, so the Vercel defaults do not work — `packages/web` depends on
`@stashco/shared` and `@stashco/contract-client`, which must build first.

### Project settings

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| Root Directory | `packages/web` |
| Install Command | `cd ../.. && pnpm install` |
| Build Command | `cd ../.. && pnpm --filter @stashco/web... build` |
| Output Directory | *(leave default)* |
| Node.js Version | 22.x |

The trailing `...` in `@stashco/web...` is pnpm syntax for "this package **and its
dependencies**". Without it the build fails on a missing `@stashco/shared`.

Note the filter goes **before** `build`. `pnpm build --filter …` forwards the flag to `tsc`
instead of to pnpm, which fails with `Unknown compiler option '--filter'`.

No Rust toolchain is needed: `packages/contract-client/dist/` is committed (D-004).

### Environment variables

Paste into Vercel → Settings → Environment Variables (all environments):

```
NEXT_PUBLIC_TREASURY_CONTRACT_ID=CBHMF3HL4XA5XCVIEGPLBPNDIMEUP5YFHFSJAE6G6545M5HWWT5OP6R7
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_TREASURY_PRINCIPAL_UNITS=4000000000
NEXT_PUBLIC_API_URL=https://your-api-host.example.com
```

Optional — omit and they default per network from `@stashco/shared`:

```
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
```

`NEXT_PUBLIC_*` values are inlined at **build** time, so changing one requires a redeploy, not
just a restart.

`NEXT_PUBLIC_TREASURY_PRINCIPAL_UNITS` is raw 7-decimal units — `4000000000` is 400 USDC, the
amount actually deposited. Leave it unset and the yield chart omits the principal reference line
rather than inventing one.

## The frontend alone is not the demo

Everything that touches money is read from the chain, so a Vercel-only deploy still works for
those. Everything that needs vendor names, history or a session does not.

| Works without the API | Needs the API |
|---|---|
| Treasury position | Sign-in (`/auth/challenge`, `/auth/verify`) |
| Deposit | Approver inbox (`/payouts/pending`) |
| Owner / approver gating | Yield chart (`/treasury/position/history`) |
| `request_payout` on-chain | Attaching a vendor name to a payout |

**The approver inbox is the story** — a judge who cannot see it misses the point of the project.
Deploy the API too.

## API

Needs a host plus a PostgreSQL database (Railway, Render and Fly all provide both).

```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://…            # from the host's managed Postgres
SESSION_SECRET=<32+ random bytes>      # openssl rand -base64 32
CORS_ORIGIN=https://<your-vercel-app>.vercel.app
STELLAR_NETWORK=testnet
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
TREASURY_CONTRACT_ID=CBHMF3HL4XA5XCVIEGPLBPNDIMEUP5YFHFSJAE6G6545M5HWWT5OP6R7
```

Leave `SERVER_SIGNER_SECRET` **unset**. Nothing calls `signingClient()`, and a server-held key
that can submit transactions would be a second path to moving money — the exact thing the
contract exists to prevent.

Run the migration once against the production database:

```bash
pnpm --filter @stashco/api exec prisma migrate deploy
```

### Two cross-site gotchas

1. **`CORS_ORIGIN` defaults to `http://localhost:3000`.** Set it to the Vercel URL or every
   browser call fails. It is comma-separated, so
   `https://stashco.vercel.app,http://localhost:3000` covers both.
2. **The session cookie is cross-site in this setup.** The browser is on `vercel.app` and the API
   on another domain, so the `sa_session` cookie needs `SameSite=None; Secure` to be sent at all.
   Verify before relying on sign-in during a demo — the symptom is a successful `/auth/verify`
   followed by `/auth/me` returning unauthenticated.

Both disappear if the API is served from the same domain (e.g. a Vercel rewrite from
`/api/*` to the backend), which is the simpler option if time is short.

## Snapshot capture

Position snapshots are captured hourly by the API process itself, so the yield chart only grows
while the API is running. A host that sleeps idle instances will leave gaps in the series.
