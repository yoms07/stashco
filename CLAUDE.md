# CLAUDE.md — StashCo

This file provides guidance to Claude Code when working in this monorepo.

> ## START HERE
>
> **Read `docs/PROGRESS.md` first** — it says what exists and what to pick up next.
> Then `docs/PLAN.md` for the architecture.
>
> `docs/DECISIONS.md` records settled choices; do not relitigate them in code.
> `docs/CONTRACT_SPEC.md` and `docs/API_SPEC.md` are the frozen interfaces.
>
> **The product idea is settled: a single-owner on-chain treasury** (`docs/PLAN.md` §1). Do
> not relitigate the design in code — amend the docs first.

## Project Overview

**StashCo** is a Web3 dApp on Stellar (Soroban). Wallet is identity — there is no
email, no password, no user table (D-001).

> The product name is **StashCo**, and packages are scoped `@stashco/*`. Only the local
> directory is still named `stellar-ambassador` — that is incidental, and it must never
> appear in user-facing copy.

Packages:
- `contracts/` — Soroban (Rust) smart contracts. Cargo workspace, not an npm package.
- `packages/contract-client/` — **Generated** TypeScript bindings (the "ABI"). Consumed by web + api.
- `packages/api/` — Hono backend API (port 3001)
- `packages/web/` — Next.js frontend (port 3000) with Freighter wallet integration
- `packages/shared/` — Shared Zod schemas, TS types, and Stellar network config

## Stack

- **Blockchain**: Stellar / Soroban (Rust, `soroban-sdk` 26), Stellar CLI 27+
- **Contract client**: `@stellar/stellar-sdk` v14 bindings from `stellar contract bindings typescript`
- **Backend**: Hono, TypeScript, Zod, Prisma (postgres), `jose` for session JWTs
- **Frontend**: Next.js 15 App Router, TanStack Query, Tailwind CSS, shadcn/ui,
  Freighter wallet (`@stellar/freighter-api`)
- **Package Manager**: pnpm · **Monorepo**: pnpm workspaces (`packages/*`)

## Development Commands

```bash
pnpm dev                                       # all packages in parallel
pnpm --filter @stashco/api dev      # backend only
pnpm --filter @stashco/web dev      # frontend only

pnpm build        # topological build (shared + contract-client first)
pnpm typecheck
pnpm lint
pnpm format
```

## Package Dependency

```
contracts/ (Rust)
   │  stellar contract bindings typescript (make bindings)
   ▼
packages/contract-client (generated TS "ABI", namespaced: Treasury)  ←  packages/web
                                                                       ←  packages/api
packages/shared  ←  packages/api
                 ←  packages/web
```

> `contract-client` builds to `dist/` (committed, D-004) — rebuild it after regenerating bindings.

## Smart Contracts (Soroban)

One crate per contract in the `contracts/` Cargo workspace. Signatures, storage keys, and the
error enum are frozen in `docs/CONTRACT_SPEC.md` — read it before touching contract code.

- **`treasury`** — single-owner on-chain treasury: deposits USDC into a Blend V2 pool for yield,
  gates every payout behind a separate approver. See `docs/CONTRACT_SPEC.md`.

Use the **Makefile** from the repo root:

```bash
make setup      # one-time: wasm target + funded testnet identity ("deployer")
make test       # cargo unit tests
make build      # compile to Wasm
make bindings   # regenerate packages/contract-client from the Wasm + rebuild dist
make deploy     # deploy + init every contract in CONTRACTS
make invoke   CONTRACT=treasury ARGS="get_owner"
make simulate CONTRACT=treasury ARGS="balance"
```

Then set the printed ids in `packages/web/.env.local` as `NEXT_PUBLIC_TREASURY_CONTRACT_ID`
and in `packages/api/.env` as `TREASURY_CONTRACT_ID`.

Prereqs: Stellar CLI (`brew install stellar-cli`), Rust, and the Wasm target
(`rustup target add wasm32v1-none`, done by `make setup`).

## Wallet (Freighter) + calling contracts

Frontend integration lives in `packages/web`:
- `providers/wallet-provider.tsx` — `<WalletProvider>` + `useWallet()` (connect/disconnect,
  address, network, restore-on-mount, account-change watcher)
- `lib/stellar.ts` — runtime network config from `NEXT_PUBLIC_*` + `@stashco/shared`
- `lib/contracts.ts` — contract client bound to the connected wallet for signing
- `components/wallet/connect-wallet-button.tsx` — connect + sign-in control

Service domains follow the `services/` pattern (types / queries / service / hook). See
`packages/web/CLAUDE.md`.

## Database

- **Provider**: PostgreSQL via Prisma
- Schema: `packages/api/prisma/schema.prisma` — just `Nonce` (auth). The chain is the authority
  on money and entitlement; Postgres is a filing cabinet (D-003).

```bash
pnpm --filter @stashco/api prisma:generate
pnpm --filter @stashco/api prisma:migrate
pnpm --filter @stashco/api prisma:studio
```

## Authentication

Wallet is the only identity (D-001) — no email, no password, no better-auth.

1. `POST /auth/challenge { address }` → server persists a single-use `Nonce`, returns it.
2. Browser calls Freighter `signMessage(nonce)`.
3. `POST /auth/verify { address, signature }` → server verifies the Ed25519 signature, marks the
   nonce used, sets an HTTP-only `sa_session` cookie (JWT, `jose`, HS256).

- Required env var: `SESSION_SECRET` (32+ random bytes)
- On-chain-derived flags (roles, entitlement) are simulated fresh per request, never cached in the JWT

See `docs/API_SPEC.md` §1 for exact shapes and `docs/DECISIONS.md` D-001 for the SEP-53
byte-encoding gotcha in Freighter's `signMessage`.

## Environment Setup

```bash
cp packages/api/.env.example packages/api/.env
cp packages/web/.env.example packages/web/.env.local
```

## Key Files

- `packages/api/src/index.ts` — Hono app entry point
- `packages/api/src/lib/soroban.ts` — read/signing contract clients
- `packages/api/src/lib/wallet-signature.ts` — SEP-53 signature verification
- `packages/web/lib/stellar.ts` — network + contract id config
- `packages/shared/src/index.ts` — all shared type exports
- `packages/shared/src/stellar.ts` — network passphrases + RPC endpoints

## Per-Package Guidance

- `packages/api/CLAUDE.md` — routes, services, middleware, error handling
- `packages/web/CLAUDE.md` — services, hooks, wallet auth, components
- `packages/shared/CLAUDE.md` — adding schemas and types
