import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { payouts } from '../payouts.route.js';
import { errorHandler } from '../../middleware/error.middleware.js';
import { PayoutMetaService } from '../../services/payout-meta.service.js';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../../lib/errors.js';
import type { HonoEnv } from '../../types/app.types.js';

const ADDRESS = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

vi.mock('../../services/payout-meta.service.js', () => ({
  PayoutMetaService: {
    upsert: vi.fn(),
  },
}));

vi.mock('../../middleware/auth.middleware.js', () => ({
  requireAuth: vi.fn(async (c, next) => {
    c.set('address', ADDRESS);
    await next();
  }),
}));

describe('Payouts Route', () => {
  const app = new Hono<HonoEnv>();
  app.route('/payouts', payouts);
  app.onError(errorHandler);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /payouts/:requestId/meta upserts and returns the metadata', async () => {
    vi.mocked(PayoutMetaService.upsert).mockResolvedValue({
      id: 'abc',
      requestId: 1,
      vendorName: 'Acme Corp',
      invoiceRef: 'INV-1042',
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const res = await app.request('/payouts/1/meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorName: 'Acme Corp', invoiceRef: 'INV-1042' }),
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; data: { vendorName: string } };
    expect(json.success).toBe(true);
    expect(json.data.vendorName).toBe('Acme Corp');
    expect(PayoutMetaService.upsert).toHaveBeenCalledWith(ADDRESS, 1, {
      vendorName: 'Acme Corp',
      invoiceRef: 'INV-1042',
    });
  });

  it('rejects a non-numeric requestId with 400', async () => {
    const res = await app.request('/payouts/not-a-number/meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorName: 'Acme Corp' }),
    });

    expect(res.status).toBe(400);
    expect(PayoutMetaService.upsert).not.toHaveBeenCalled();
  });

  it('rejects an invalid body with 400', async () => {
    const res = await app.request('/payouts/1/meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    expect(PayoutMetaService.upsert).not.toHaveBeenCalled();
  });

  it('propagates a 403 from the service when the caller is neither owner nor approver', async () => {
    vi.mocked(PayoutMetaService.upsert).mockRejectedValue(
      new ForbiddenError('Only the treasury owner or approver may write payout metadata')
    );

    const res = await app.request('/payouts/1/meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorName: 'Acme Corp' }),
    });

    expect(res.status).toBe(403);
  });

  it('propagates a 404 from the service for an unknown on-chain requestId', async () => {
    vi.mocked(PayoutMetaService.upsert).mockRejectedValue(
      new NotFoundError('Payout request 999 not found')
    );

    const res = await app.request('/payouts/999/meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorName: 'Acme Corp' }),
    });

    expect(res.status).toBe(404);
  });

  it('rejects an unauthenticated request with 401', async () => {
    const noAuthApp = new Hono<HonoEnv>();
    const { requireAuth } = await import('../../middleware/auth.middleware.js');
    vi.mocked(requireAuth).mockImplementationOnce(async () => {
      throw new UnauthorizedError('No session');
    });
    noAuthApp.route('/payouts', payouts);
    noAuthApp.onError(errorHandler);

    const res = await noAuthApp.request('/payouts/1/meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorName: 'Acme Corp' }),
    });

    expect(res.status).toBe(401);
  });
});
