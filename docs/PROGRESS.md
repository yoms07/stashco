# PROGRESS

> Read this first. It says what exists and what to pick up next.

## Status: treasury contract built, deployed to testnet, and funded

The toolchain is wired end to end — contract → Wasm → generated bindings → API → web —
against the real `treasury` contract (single-owner on-chain treasury supplying Blend V2 for
yield, payouts gated behind a separate approver). The `ambassador` placeholder is gone.

## Done

- `contracts/` Cargo workspace + `treasury` contract, 17 unit tests passing (mock SEP-41 token,
  mock Blend pool — no network needed).
- `make` targets: `setup`, `test`, `build`, `bindings`, `deploy`, `invoke`, `simulate`, retargeted
  at `treasury` with `init(owner, approver, pool, usdc)`.
- `packages/contract-client` — real generated bindings (`src/treasury.ts`), committed `dist/`.
- Wallet auth end to end: `POST /auth/challenge` → Freighter `signMessage` → `POST /auth/verify`
  → HTTP-only session cookie. `GET /auth/me`, `POST /auth/logout`.
- `WalletProvider` / `useWallet()` (Freighter connect, restore, account-change watch).
- `lib/contracts.ts` — `getTreasuryClient()`, bound to the connected wallet for signing.
- Deployed to testnet and initialized with two distinct funded identities (owner ≠ approver,
  per the contract's own `OwnerIsApprover` check).
- **First real deposit made — the yield clock has started** (2026-08-15).

### Deployed testnet state

| What | Value |
|------|-------|
| Contract id | `CBHMF3HL4XA5XCVIEGPLBPNDIMEUP5YFHFSJAE6G6545M5HWWT5OP6R7` |
| Owner (`deployer`) | `GBW65PM5E3O3TVV4JMBVSJI7NDOFLHH3MNJJDLRARXRZ562HE3ZLOXQV` |
| Approver | `GD3MA2JB42SY4O5NQK4CNQK7PMTRUTCNR26URLRQVPXYKBSVX4TZXDF3` |
| Blend pool | `CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF` |
| USDC | `CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU` |
| Deploy tx | `fd7346c07abfe6d719993cc3aea97c151db80ca8743bff155ceb95f1b553d211` |
| Init tx | `e35fd25c5ad02b1ba1eb6161d2abbf862c15312750b66c11af0ad5499a4d46ea` |
| Deposit tx (400 USDC from `deployer`) | `36f83f4364ca536267f80ad33a7bcd5171751dd9f0213224579be4e60925eb6a` |

`get_owner()` / `get_approver()` confirmed two different addresses matching the above.
`balance()` immediately after the deposit read `3999999999` (one stroop under 400 USDC —
Blend flooring the bToken round-trip in both directions, per
`.scratch/notes/05-blend-auth-spike.md`; not the ~5.6%-low reading that would indicate raw
bTokens leaking through). `deployer` retains ~100 USDC for later UI testing.

## Verified

- `cd contracts && cargo test` → 17 passed (treasury only; the `ambassador` crate is deleted)
- `pnpm -r typecheck` → clean across all packages after removing every `ambassador` reference
- `pnpm --filter @stashco/contract-client build` → clean, `dist/` regenerated

## Also done (landed in parallel with the contract track)

- **Prisma models + the repo's first migration** (#8) — `PayoutMeta`, `PositionSnapshot`.
  Applied for real against Postgres, not just authored: `_prisma_migrations`, `nonces`,
  `payout_metas`, `position_snapshots` all present. `positionUsdc` is a `String` — an `i128`
  overflows Postgres `BigInt`, and a float would destroy the precision the yield chart depends on.
- **Design system foundation** (#12) — `docs/DESIGN.md` tokens wired into `globals.css` +
  Tailwind, Hanken Grotesk / Inter via `next/font`, and shadcn `button`, `input`, `card`,
  `badge`, `table`, `dialog`, `skeleton` restyled onto the tokens. No inline hex anywhere in
  `packages/web` outside the token definitions.

## Backend track complete (#8–#11)

`GET /treasury/position` · `GET /treasury/position/history` · `POST /payouts/:id/meta` ·
`GET /payouts` · `GET /payouts/pending`. 39 tests passing.

Owner/approver are simulated fresh from the contract per request and never read from the JWT
(D-002) — `set_approver` is callable, so a cached role is a live authorization bypass.
Request state is never persisted to Postgres; metadata is a left join on top of chain truth
(D-003), verified in both directions against live data.

## The security claim, proven on-chain

Not just unit-tested — executed on testnet against the deployed contract:

1. Owner queued request 0.
2. **Owner tried to approve it → rejected**, `Missing signing key for account GD3MA2JB…`
   (the approver). Request stayed `Pending` rather than being consumed.
3. Approver approved → vendor `GBL4TKOX…` went 0 → **5.0000000 USDC**.
4. Position dropped `4000000064` → `3950000043`.

On-chain now: request 0 `Approved`, requests 1 and 2 `Pending` (real data for the approver
inbox). Request 1 has a `PayoutMeta` row ("Globex"); 0 and 2 deliberately do not, so the left
join stays honest.

## All 16 tickets closed

Contract, backend and frontend tracks are complete. CI runs both jobs green on every push.

## Not done / next

1. **Nothing has been signed by a real wallet.** Every screen typechecks, builds and reads live
   contract state, but Freighter cannot be driven headlessly — the signed deposit, request and
   approve paths were verified by simulation only. This is the top remaining risk.
2. Deploy the frontend and fill in the live demo URL in the README.
3. Capture the three README screenshots (`docs/web.png`, `docs/mobile.png`, `docs/ci.png`).
4. Flip the GitHub repo to public before submitting.
5. Add doc comments to the contract's `Error` enum so generated bindings carry real messages —
   deferred because it changes the wasm, and redeploying would reset the position and restart
   the yield clock.

## Local dev dependencies

Postgres runs in Docker for local work — `sa-postgres`, credentials exactly as
`packages/api/.env.example`. There is no compose file; start it with:

```bash
docker run -d --name sa-postgres -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=stellar_ambassador -p 5432:5432 postgres:16-alpine
```

## Known gaps

- **`pnpm lint` does not work anywhere in this repo.** There is no ESLint config at all
  (no `.eslintrc*`, no `eslint.config.*`), so `next lint` drops into an interactive setup
  prompt and fails non-interactively. Pre-existing; worth its own chore ticket. `next build`
  still type-checks and lints as part of the build.
- `PayoutMeta.requestId` is Postgres `Int` (max 2.1B) against the contract's `u32` (max 4.3B).
  Unreachable at any real scale; accepted rather than migrated.

## Discovered facts

- Freighter's `signMessage` applies SEP-53 framing before signing:
  `SHA-256("Stellar Signed Message:\n" + message)`, returned base64. The API verifier in
  `src/lib/wallet-signature.ts` depends on this exactly.
- `stellar contract bindings typescript` emits `src/index.ts`; `make bindings` copies it to
  `packages/contract-client/src/<contract>.ts` so the hand-written barrel survives.
- Blend positions are bTokens, not underlying — `balance()` must multiply by `b_rate` (scaled
  1e12) and divide, never use the reserve's `scalar` (1e7). See `docs/DECISIONS.md` D-008.
