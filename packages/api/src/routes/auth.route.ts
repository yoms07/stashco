import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { deleteCookie, setCookie } from 'hono/cookie';
import { ChallengeRequestSchema, VerifyRequestSchema } from '@stashco/shared';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { SESSION_COOKIE, signSessionToken } from '../lib/jwt.js';
import { noContent, success } from '../lib/response.js';
import { AuthService } from '../services/auth.service.js';
import type { HonoEnv } from '../types/app.types.js';

const auth = new Hono<HonoEnv>();

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

auth.post('/challenge', zValidator('json', ChallengeRequestSchema), async (c) => {
  const { address } = c.req.valid('json');
  return success(c, await AuthService.challenge(address));
});

auth.post('/verify', zValidator('json', VerifyRequestSchema), async (c) => {
  const { address, signature } = c.req.valid('json');
  const result = await AuthService.verify(address, signature);

  const isProd = env.NODE_ENV === 'production';
  setCookie(c, SESSION_COOKIE, await signSessionToken(result.address), {
    httpOnly: true,
    sameSite: isProd ? 'None' : 'Lax',
    secure: isProd,
    path: '/',
    maxAge: SEVEN_DAYS_SECONDS,
  });

  return success(c, result);
});

auth.post('/logout', (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return noContent(c);
});

auth.get('/me', requireAuth, async (c) => {
  return success(c, await AuthService.me(c.get('address')));
});

export { auth };
