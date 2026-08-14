# stellar-ambassador

A Stellar / Soroban dApp monorepo. Wallet is identity; the chain is the authority on state
that matters.

> The product idea is not defined yet — `contracts/contracts/ambassador` is a placeholder that
> exists to prove the toolchain end to end. See `docs/PROGRESS.md`.

## Getting Started

```bash
pnpm install

cp packages/api/.env.example packages/api/.env
cp packages/web/.env.example packages/web/.env.local

pnpm --filter @stellar-ambassador/api prisma:migrate   # needs a running postgres
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

Put the printed ids in `packages/api/.env` (`AMBASSADOR_CONTRACT_ID`) and
`packages/web/.env.local` (`NEXT_PUBLIC_AMBASSADOR_CONTRACT_ID`).

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
