import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TreasuryService } from '../treasury.service.js';
import { readClient } from '../../lib/soroban.js';
import { prisma } from '../../config/database.js';

vi.mock('../../lib/soroban.js', () => ({
  readClient: vi.fn(),
}));

vi.mock('../../config/database.js', () => ({
  prisma: {
    positionSnapshot: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../config/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('TreasuryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPosition', () => {
    it('returns the balance as a string', async () => {
      vi.mocked(readClient).mockReturnValue({
        balance: vi.fn().mockResolvedValue({ result: 4000000022n }),
      } as unknown as ReturnType<typeof readClient>);

      const position = await TreasuryService.getPosition();
      expect(position).toEqual({ positionUsdc: '4000000022' });
    });

    it('throws when the contract read fails', async () => {
      vi.mocked(readClient).mockReturnValue({
        balance: vi.fn().mockRejectedValue(new Error('rpc down')),
      } as unknown as ReturnType<typeof readClient>);

      await expect(TreasuryService.getPosition()).rejects.toThrow(
        'Failed to read treasury position'
      );
    });
  });

  describe('captureSnapshot', () => {
    it('persists a snapshot with the position as a string', async () => {
      vi.mocked(readClient).mockReturnValue({
        balance: vi.fn().mockResolvedValue({ result: 4000000022n }),
      } as unknown as ReturnType<typeof readClient>);

      await TreasuryService.captureSnapshot();

      expect(prisma.positionSnapshot.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ positionUsdc: '4000000022' }),
      });
    });

    it('skips the write when the contract read fails, never writing a zero row', async () => {
      vi.mocked(readClient).mockReturnValue({
        balance: vi.fn().mockRejectedValue(new Error('rpc down')),
      } as unknown as ReturnType<typeof readClient>);

      await TreasuryService.captureSnapshot();

      expect(prisma.positionSnapshot.create).not.toHaveBeenCalled();
    });
  });
});
