# contracts

Cargo workspace for the Soroban contracts. One crate per contract under `contracts/`.

```text
contracts/
├── contracts/
│   └── ambassador/        # placeholder contract — rename/replace once the idea is fixed
│       ├── src/lib.rs
│       ├── src/test.rs
│       └── Cargo.toml
└── Cargo.toml             # workspace + release profile
```

Drive everything from the repo-root `Makefile` (`make test`, `make build`, `make bindings`,
`make deploy`). When you add a second contract, add its crate name to `CONTRACTS` in the
Makefile so build/bindings/deploy pick it up.

Contract signatures, storage keys, and the error enum belong in `docs/CONTRACT_SPEC.md` —
freeze them there before other agents build against them.
