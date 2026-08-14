# @stellar-ambassador/contract-client

**Generated** TypeScript bindings for the Soroban contracts — the on-chain "ABI" that lets
the frontend and backend call the contracts type-safely.

> ⚠️ `src/ambassador.ts` is generated. Do **not** edit it by hand. `src/index.ts` (the
> barrel), `package.json`, `tsconfig.json`, and this README are hand-maintained.

## Regenerating

After changing a contract, from the repo root:

```bash
pnpm contract:build      # compile contracts to Wasm
pnpm contract:bindings   # regenerate src/*.ts from the Wasm and rebuild dist/
```

`pnpm contract:bindings` (== `make bindings`) writes only the generated per-contract files
and rebuilds `dist/`, which is what consumers import.

## Usage

The bindings are generated from the Wasm spec, so they carry no baked-in `networks`
constant. Construct a client with the network + deployed contract id yourself:

```ts
import { Ambassador } from '@stellar-ambassador/contract-client';

const client = new Ambassador.Client({
  contractId,
  networkPassphrase,
  rpcUrl,
  publicKey,
  signTransaction,
});
```

In the web app use `lib/contracts.ts`, which wires this to the connected Freighter wallet;
in the API use `src/lib/soroban.ts`, which simulates as `NULL_ACCOUNT` (reads only).
