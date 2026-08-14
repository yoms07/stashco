import { Hono } from 'hono';
import { success } from '../lib/response.js';
import { TreasuryService } from '../services/treasury.service.js';

const treasury = new Hono();

treasury.get('/position', async (c) => {
  const position = await TreasuryService.getPosition();
  return success(c, position);
});

treasury.get('/position/history', async (c) => {
  const history = await TreasuryService.getHistory();
  return success(c, history);
});

export { treasury };
