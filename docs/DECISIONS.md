# DECISIONS

Settled choices. Do not relitigate them in code; amend here first.

| ID | Decision | Rationale |
|----|----------|-----------|
| D-001 | **Wallet is the only identity.** Challenge–response over a single-use nonce; no email, no password, no user table. | The chain already identifies the user. A parallel account system would be a second source of truth. Gotcha: Freighter's `signMessage` signs `SHA-256("Stellar Signed Message:\n" + msg)` (SEP-53), not the raw bytes. |
| D-002 | **Session is an HTTP-only JWT cookie** (`sa_session`, HS256, 7d, `jose`). | Nothing sensitive is stored client-side, and the API stays stateless. Any on-chain-derived flag (role, entitlement) is simulated fresh per request, never baked into the token. |
| D-003 | **Postgres holds no money and no entitlement** — only login nonces and off-chain metadata. | Anything the DB could contradict the chain about is a bug waiting to happen. |
| D-004 | **Generated contract bindings are committed** (`packages/contract-client/dist/`). | Web and API build without a Rust toolchain; CI and Vercel stay simple. |
| D-005 | **pnpm workspaces**, contracts kept in a separate Cargo workspace under `contracts/`. | Rust and TS toolchains stay independent; the Makefile is the seam. |
| D-006 | **`set_approver` is approver-only** — the owner can never rotate the approver. | This is what makes the owner/approver gate real rather than decorative. If the owner could reassign the approver, the owner could appoint themselves and the entire security claim — "the owner cannot spend alone" — would be void. |
| D-007 | **No recovery path for a lost approver key.** Funds stay in Blend, accruing, permanently unwithdrawable. | An escape hatch would by definition be a way to move funds without approval — the exact thing the contract exists to prevent. Documented as a deliberate risk in the README rather than mitigated; N-of-M approvers is the v2 fix. |
| D-008 | **`balance()` converts bTokens to underlying via `b_rate` scaled by 1e12** (`SCALAR_12`), not the reserve's `scalar` field (1e7, the token's decimals). | Blend positions are denominated in bTokens, which appreciate against the underlying as `b_rate` rises — that appreciation is the yield. Returning the raw bToken count would understate the treasury by the accrued yield (~5.6% at spike time) and would make the `InsufficientFunds` pre-check compare bTokens against underlying, rejecting payouts the treasury could actually afford. Verified on testnet in the #5 spike (`.scratch/notes/05-blend-auth-spike.md`). |

Add a row — with the reason, not just the choice — every time a decision gets made.
