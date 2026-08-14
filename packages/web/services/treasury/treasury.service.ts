import { Treasury } from '@stellar-ambassador/contract-client';

import { getTreasuryClient } from '@/lib/contracts';

import type { DepositInput, TreasuryPosition } from './treasury.types';

/**
 * `AssembledTransaction.result` extracts the contract error number from the simulation
 * diagnostics via regex, but the generated client's default `errorTypes` come from the Rust
 * `Error` enum's doc comments (client.js `spec.errorCases()`) — this contract has none, so
 * `.result.unwrapErr().message` is always `""`. The variant name lives in the hand-generated
 * `Treasury.Errors` map instead, keyed by the same number, so we re-parse the raw diagnostic
 * text ourselves (verified live against the deployed contract, see .scratch/specs/treasury-vault.md §7).
 */
const CONTRACT_ERROR_PATTERN = /Error\(Contract, #(\d+)\)/;

function friendlyDepositError(rawMessage: string): string {
  if (rawMessage.includes('trustline entry is missing for account')) {
    return 'Your wallet has no trustline for USDC yet — add one in Freighter before depositing.';
  }
  if (rawMessage.includes('resulting balance is not within the allowed range')) {
    return 'Your wallet holds no USDC to deposit.';
  }

  const match = rawMessage.match(CONTRACT_ERROR_PATTERN);
  const code = match ? Number(match[1]) : null;
  const variant = code !== null ? Treasury.Errors[code as keyof typeof Treasury.Errors]?.message : undefined;
  if (variant === 'InvalidAmount') {
    return 'Enter an amount greater than zero.';
  }

  return 'The deposit could not be completed. Please try again.';
}

export class TreasuryService {
  /** Live position in raw contract units, read straight from the chain (no API round trip). */
  static async getPosition(): Promise<TreasuryPosition> {
    const client = getTreasuryClient();
    const tx = await client.balance();
    return { balanceUnits: tx.result.toString() };
  }

  /** Builds, simulates and signs `deposit(from, amount)` as one transaction. */
  static async deposit({ address, amountUnits }: DepositInput): Promise<void> {
    const client = getTreasuryClient(address);

    let assembled: Awaited<ReturnType<typeof client.deposit>>;
    try {
      assembled = await client.deposit({ from: address, amount: amountUnits });
      // Forces the SDK to surface the raw simulation diagnostics (see the note above) instead
      // of the empty-message `Err` that `.result` would otherwise return silently.
      void assembled.simulationData;
    } catch (e) {
      throw new Error(friendlyDepositError(e instanceof Error ? e.message : String(e)));
    }

    const sent = await assembled.signAndSend();
    if (sent.result.isErr()) {
      throw new Error(friendlyDepositError(sent.result.unwrapErr().message));
    }
  }
}
