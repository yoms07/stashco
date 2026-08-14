import { Hono } from 'hono';
import { success } from '../lib/response.js';

const health = new Hono();

health.get('/', (c) => {
  return success(c, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export { health };
