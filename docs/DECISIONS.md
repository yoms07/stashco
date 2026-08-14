# DECISIONS

Settled choices. Do not relitigate them in code; amend here first.

| ID | Decision | Rationale |
|----|----------|-----------|
| D-001 | **Wallet is the only identity.** Challenge–response over a single-use nonce; no email, no password, no user table. | The chain already identifies the user. A parallel account system would be a second source of truth. Gotcha: Freighter's `signMessage` signs `SHA-256("Stellar Signed Message:\n" + msg)` (SEP-53), not the raw bytes. |
| D-002 | **Session is an HTTP-only JWT cookie** (`sa_session`, HS256, 7d, `jose`). | Nothing sensitive is stored client-side, and the API stays stateless. Any on-chain-derived flag (role, entitlement) is simulated fresh per request, never baked into the token. |
| D-003 | **Postgres holds no money and no entitlement** — only login nonces and off-chain metadata. | Anything the DB could contradict the chain about is a bug waiting to happen. |
| D-004 | **Generated contract bindings are committed** (`packages/contract-client/dist/`). | Web and API build without a Rust toolchain; CI and Vercel stay simple. |
| D-005 | **pnpm workspaces**, contracts kept in a separate Cargo workspace under `contracts/`. | Rust and TS toolchains stay independent; the Makefile is the seam. |

Add a row — with the reason, not just the choice — every time a decision gets made.
