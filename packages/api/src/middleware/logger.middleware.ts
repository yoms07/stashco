import type { Context, Next } from 'hono';
import { logger } from '../config/logger.js';

export async function loggerMiddleware(c: Context, next: Next) {
  const start = Date.now();
  const { method, url } = c.req;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  logger.info(`${method} ${url} ${status} - ${duration}ms`);
}
