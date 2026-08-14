import type { Context, Next } from 'hono';
import { TooManyRequestsError } from '../lib/errors.js';
import { logger } from '../config/logger.js';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  message?: string;
  keyGenerator?: (c: Context) => string;
}

interface RateLimitStore {
  get(key: string): Promise<number | null>;
  increment(key: string, ttl: number): Promise<number>;
}

/**
 * In-memory rate limit store
 */
class MemoryStore implements RateLimitStore {
  private hits: Map<string, { count: number; resetTime: number }> = new Map();

  async get(key: string): Promise<number | null> {
    const entry = this.hits.get(key);
    if (!entry) return null;

    // Clean up expired entries
    if (Date.now() > entry.resetTime) {
      this.hits.delete(key);
      return null;
    }

    return entry.count;
  }

  async increment(key: string, ttl: number): Promise<number> {
    const now = Date.now();
    const entry = this.hits.get(key);

    if (!entry || now > entry.resetTime) {
      const resetTime = now + ttl;
      this.hits.set(key, { count: 1, resetTime });
      return 1;
    }

    entry.count++;
    return entry.count;
  }

  // Cleanup old entries periodically
  startCleanup(intervalMs: number = 60000) {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.hits.entries()) {
        if (now > entry.resetTime) {
          this.hits.delete(key);
        }
      }
    }, intervalMs);
  }
}

// Create singleton memory store
const memoryStore = new MemoryStore();
memoryStore.startCleanup();

/**
 * Rate limiting middleware factory
 */
export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later',
    keyGenerator = (c) => c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
  } = options;

  return async (c: Context, next: Next) => {
    const key = `rate-limit:${keyGenerator(c)}`;
    const store = memoryStore;

    try {
      const hits = await store.increment(key, windowMs);

      // Set rate limit headers
      c.header('X-RateLimit-Limit', max.toString());
      c.header('X-RateLimit-Remaining', Math.max(0, max - hits).toString());
      c.header('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());

      if (hits > max) {
        logger.warn('Rate limit exceeded:', { key, hits, max });
        throw new TooManyRequestsError(message);
      }

      await next();
    } catch (error) {
      if (error instanceof TooManyRequestsError) {
        throw error;
      }
      // If store fails, log but allow request
      logger.error('Rate limit store error:', error);
      await next();
    }
  };
}

/**
 * Common rate limit configurations
 */
export const rateLimits = {
  // Strict: 10 requests per minute
  strict: rateLimit({
    windowMs: 60 * 1000,
    max: 10,
  }),

  // Standard: 100 requests per minute
  standard: rateLimit({
    windowMs: 60 * 1000,
    max: 100,
  }),

  // Lenient: 1000 requests per minute
  lenient: rateLimit({
    windowMs: 60 * 1000,
    max: 1000,
  }),

  // Auth: 5 login attempts per 15 minutes
  auth: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts, please try again later',
  }),
};
