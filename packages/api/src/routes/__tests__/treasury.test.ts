import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { treasury } from '../treasury.route.js';
import { errorHandler } from '../../middleware/error.middleware.js';
import { TreasuryService } from '../../services/treasury.service.js';

vi.mock('../../services/treasury.service.js', () => ({
  TreasuryService: {
    getPosition: vi.fn(),
    getHistory: vi.fn(),
  },
}));

describe('Treasury Route', () => {
  const app = new Hono();
  app.route('/treasury', treasury);
  app.onError(errorHandler);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /treasury/position returns the position as a string', async () => {
    vi.mocked(TreasuryService.getPosition).mockResolvedValue({ positionUsdc: '4000000022' });

    const res = await app.request('/treasury/position');
    expect(res.status).toBe(200);

    const json = (await res.json()) as { success: boolean; data: { positionUsdc: string } };
    expect(json.success).toBe(true);
    expect(json.data.positionUsdc).toBe('4000000022');
    expect(typeof json.data.positionUsdc).toBe('string');
  });

  it('GET /treasury/position propagates a service failure as 500', async () => {
    vi.mocked(TreasuryService.getPosition).mockRejectedValue(
      new Error('Failed to read treasury position')
    );

    const res = await app.request('/treasury/position');
    expect(res.status).toBe(500);
  });

  it('GET /treasury/position/history returns snapshots newest-first', async () => {
    const rows = [
      { id: '2', capturedAt: new Date('2026-08-15T02:00:00Z'), positionUsdc: '4000000022', createdAt: new Date() },
      { id: '1', capturedAt: new Date('2026-08-15T01:00:00Z'), positionUsdc: '4000000000', createdAt: new Date() },
    ];
    vi.mocked(TreasuryService.getHistory).mockResolvedValue(rows);

    const res = await app.request('/treasury/position/history');
    expect(res.status).toBe(200);

    const json = (await res.json()) as { success: boolean; data: typeof rows };
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);
    expect(json.data[0].positionUsdc).toBe('4000000022');
  });
});
