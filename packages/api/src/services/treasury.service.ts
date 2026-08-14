import type { PositionSnapshot } from '@prisma/client';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { InternalServerError } from '../lib/errors.js';
import { readClient } from '../lib/soroban.js';

const SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000;

/** Reads the contract's live Blend position. Returns null (never throws) so callers can
 * decide whether a failed read is fatal (the live endpoint) or skippable (a snapshot). */
async function readBalance(): Promise<bigint | null> {
  try {
    const tx = await readClient().balance();
    return tx.result;
  } catch (err) {
    logger.error('Treasury balance read failed', { error: err });
    return null;
  }
}

export class TreasuryService {
  /** Live position, simulated fresh from the contract. Never cached — it is the headline
   * number and it is authoritative. */
  static async getPosition(): Promise<{ positionUsdc: string }> {
    const balance = await readBalance();
    if (balance === null) {
      throw new InternalServerError('Failed to read treasury position');
    }
    return { positionUsdc: balance.toString() };
  }

  static async getHistory(): Promise<PositionSnapshot[]> {
    return prisma.positionSnapshot.findMany({ orderBy: { capturedAt: 'desc' } });
  }

  /** A failed contract read is skipped, never written as a zero or null row — a false zero
   * in the series is worse than a gap. */
  static async captureSnapshot(): Promise<void> {
    const balance = await readBalance();
    if (balance === null) {
      logger.warn('Skipping treasury snapshot: contract read failed');
      return;
    }

    const positionUsdc = balance.toString();
    await prisma.positionSnapshot.create({
      data: { capturedAt: new Date(), positionUsdc },
    });
    logger.info('Captured treasury position snapshot', { positionUsdc });
  }

  /** Captures immediately so history starts accumulating now, then on a fixed interval.
   * Snapshots persist to Postgres, so a restart just resumes the schedule — it never loses
   * history, and any gap is exactly the process's downtime. */
  static startSnapshotCapture(intervalMs = SNAPSHOT_INTERVAL_MS): void {
    void TreasuryService.captureSnapshot();
    setInterval(() => {
      void TreasuryService.captureSnapshot();
    }, intervalMs);
  }
}
