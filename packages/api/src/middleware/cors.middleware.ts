import { cors } from 'hono/cors';
import { env } from '../config/env.js';

export const corsMiddleware = cors({
  origin: env.CORS_ORIGIN.split(',').map(o => o.trim()),
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});
