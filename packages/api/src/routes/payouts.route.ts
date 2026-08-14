import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { PayoutMetaRequestSchema } from '@stellar-ambassador/shared';
import { BadRequestError } from '../lib/errors.js';
import { success } from '../lib/response.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { PayoutMetaService } from '../services/payout-meta.service.js';
import { PayoutService } from '../services/payout.service.js';
import type { HonoEnv } from '../types/app.types.js';

const payouts = new Hono<HonoEnv>();

payouts.get('/', async (c) => {
  const list = await PayoutService.getAll();
  return success(c, list);
});

payouts.get('/pending', async (c) => {
  const list = await PayoutService.getPending();
  return success(c, list);
});

payouts.post(
  '/:requestId/meta',
  requireAuth,
  zValidator('json', PayoutMetaRequestSchema),
  async (c) => {
    const requestId = Number(c.req.param('requestId'));
    if (!Number.isInteger(requestId) || requestId < 0) {
      throw new BadRequestError('Invalid requestId');
    }

    const data = c.req.valid('json');
    const meta = await PayoutMetaService.upsert(c.get('address'), requestId, data);
    return success(c, meta);
  }
);

export { payouts };
