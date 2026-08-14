import { getTreasuryClient } from '@/lib/contracts';
import { contractErrorVariant } from '@/lib/contract-errors';

import type { DepositInput, TreasuryPosition } from './treasury.types';

function friendlyDepositError(rawMessage: string): string {
  if (rawMessage.includes('trustline entry is missing for account')) {
    return 'Your wallet has no trustline for USDC yet — add one in Freighter before depositing.';
  }
  if (rawMessage.includes('resulting balance is not within the allowed range')) {
    return 'Your wallet holds no USDC to deposit.';
  }

  if (contractErrorVariant(rawMessage) === 'InvalidAmount') {
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
