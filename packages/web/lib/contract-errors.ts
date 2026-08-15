import { Treasury } from '@stashco/contract-client';

/**
 * `AssembledTransaction.result`'s default `errorTypes` come from `spec.errorCases()`, which
 * reads the Rust `Error` enum's doc comments (client.js). The treasury's `Error` enum has none,
 * so `.result.unwrapErr().message` is always `""` even though `Treasury.Errors` holds the real
 * variant names keyed by the same number. Re-parse the raw simulation diagnostic text instead
 * (verified live against the deployed contract, see .scratch/specs/treasury-vault.md §7).
 */
const CONTRACT_ERROR_PATTERN = /Error\(Contract, #(\d+)\)/;

/** Extracts the `Treasury.Errors` variant name (e.g. `"InvalidAmount"`) from a raw diagnostic string. */
export function contractErrorVariant(rawMessage: string): string | undefined {
  const match = rawMessage.match(CONTRACT_ERROR_PATTERN);
  const code = match ? Number(match[1]) : null;
  return code !== null ? Treasury.Errors[code as keyof typeof Treasury.Errors]?.message : undefined;
}
