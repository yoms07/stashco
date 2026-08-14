import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { UnauthorizedError } from '../lib/errors.js';
import { SESSION_COOKIE, verifySessionToken } from '../lib/jwt.js';
import type { HonoEnv } from '../types/app.types.js';

/** Decodes the session cookie and sets `c.set('address', ...)`. 401 on missing/invalid. */
export async function requireAuth(c: Context<HonoEnv>, next: Next) {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) {
    throw new UnauthorizedError('No session');
  }
  try {
    c.set('address', await verifySessionToken(token));
  } catch {
    throw new UnauthorizedError('Invalid or expired session');
  }
  await next();
}
