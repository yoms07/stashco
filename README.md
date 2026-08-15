# StashCo

> The product is **StashCo**. The local directory is still `stellar-ambassador`; the GitHub
> repo and the `@stashco/*` package scope carry the real name.

A Stellar / Soroban dApp monorepo. Wallet is identity; the chain is the authority on state
that matters.

> A single-owner on-chain treasury: `owner` deposits USDC into a Blend V2 pool for yield;
> paying a vendor needs a separate `approver`'s signature. See `docs/PLAN.md`.
>
> **Losing the approver key permanently freezes the treasury — no recovery path.** This is
> deliberate (see `docs/DECISIONS.md` D-007); N-of-M approvers is the v2 fix.

## Getting Started

```bash
pnpm install

cp packages/api/.env.example packages/api/.env
cp packages/web/.env.example packages/web/.env.local

pnpm --filter @stashco/api prisma:migrate   # needs a running postgres
pnpm dev
```

Web on http://localhost:3000, API on http://localhost:3001.

You also need the [Freighter](https://www.freighter.app) browser extension, set to Testnet.

## Contracts

```bash
make setup      # one-time: wasm target + funded testnet identity
make test       # cargo unit tests
make bindings   # rebuild the TypeScript client from the Wasm
make deploy     # deploy + init on testnet, prints the contract ids
```

Put the printed ids in `packages/api/.env` (`TREASURY_CONTRACT_ID`) and
`packages/web/.env.local` (`NEXT_PUBLIC_TREASURY_CONTRACT_ID`).

`make help` lists every target.

## Project Structure

```
stellar-ambassador/
├── contracts/                  # Soroban contracts (Rust, Cargo workspace)
├── packages/
│   ├── contract-client/        # generated TS bindings — the on-chain ABI
│   ├── api/                    # Hono backend (port 3001)
│   ├── web/                    # Next.js frontend (port 3000)
│   └── shared/                 # Zod schemas, types, Stellar network config
├── docs/                       # PLAN, DECISIONS, CONTRACT_SPEC, API_SPEC, PROGRESS
└── Makefile                    # the Rust <-> TypeScript seam
```

## Scripts

- `pnpm dev` — every package in parallel
- `pnpm build` — topological build (shared + contract-client first)
- `pnpm typecheck` / `pnpm lint` / `pnpm format`
- `pnpm contract:test` / `pnpm contract:build` / `pnpm contract:bindings`
