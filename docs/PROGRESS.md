# PROGRESS

> Read this first. It says what exists and what to pick up next.

## Status: scaffold complete, product idea not yet defined

The toolchain is wired end to end — contract → Wasm → generated bindings → API → web —
against a **placeholder** contract (`ambassador`: admin + counter). Nothing here encodes
a product decision; replace the contract body once the idea lands.

## Done

- `contracts/` Cargo workspace + `ambassador` placeholder contract, 4 unit tests passing.
- `make` targets: `setup`, `test`, `build`, `bindings`, `deploy`, `invoke`, `simulate`.
- `packages/contract-client` — real generated bindings (`src/ambassador.ts`), committed `dist/`.
- Wallet auth end to end: `POST /auth/challenge` → Freighter `signMessage` → `POST /auth/verify`
  → HTTP-only session cookie. `GET /auth/me`, `POST /auth/logout`.
- `WalletProvider` / `useWallet()` (Freighter connect, restore, account-change watch).
- `lib/contracts.ts` — contract client bound to the connected wallet for signing.

## Verified

- `cd contracts && cargo test` → 4 passed
- `pnpm -r typecheck` → all 4 packages clean
- `pnpm --filter @stellar-ambassador/api test` → 13 passed

## Not done / next

1. **Define the idea** — then rewrite `docs/PLAN.md` and freeze `docs/CONTRACT_SPEC.md`.
2. Replace the `ambassador` placeholder contract; rerun `make bindings`.
3. `make setup && make deploy`, then fill `AMBASSADOR_CONTRACT_ID` /
   `NEXT_PUBLIC_AMBASSADOR_CONTRACT_ID`.
4. First migration: `pnpm --filter @stellar-ambassador/api prisma:migrate` (no migrations yet).
5. Design system — no `DESIGN.md` and no shadcn/ui components installed yet; the wallet
   button uses plain Tailwind.

## Discovered facts

- Freighter's `signMessage` applies SEP-53 framing before signing:
  `SHA-256("Stellar Signed Message:\n" + message)`, returned base64. The API verifier in
  `src/lib/wallet-signature.ts` depends on this exactly.
- `stellar contract bindings typescript` emits `src/index.ts`; `make bindings` copies it to
  `packages/contract-client/src/<contract>.ts` so the hand-written barrel survives.
