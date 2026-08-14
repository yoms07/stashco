import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { errorHandler } from '../error.middleware.js';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  InternalServerError,
} from '../../lib/errors.js';

describe('Error Middleware', () => {
  const app = new Hono();

  // Test route that throws errors
  app.get('/bad-request', () => {
    throw new BadRequestError('Invalid input');
  });

  app.get('/not-found', () => {
    throw new NotFoundError('Resource not found');
  });

  app.get('/unauthorized', () => {
    throw new UnauthorizedError('Not authenticated');
  });

  app.get('/server-error', () => {
    throw new InternalServerError('Something went wrong');
  });

  app.get('/unknown-error', () => {
    throw new Error('Unknown error');
  });

  app.onError(errorHandler);

  it('should handle BadRequestError with 400 status', async () => {
    const res = await app.request('/bad-request');
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('Invalid input');
    expect(json.code).toBe('BAD_REQUEST');
  });

  it('should handle NotFoundError with 404 status', async () => {
    const res = await app.request('/not-found');
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('Resource not found');
    expect(json.code).toBe('NOT_FOUND');
  });

  it('should handle UnauthorizedError with 401 status', async () => {
    const res = await app.request('/unauthorized');
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('Not authenticated');
    expect(json.code).toBe('UNAUTHORIZED');
  });

  it('should handle InternalServerError with 500 status', async () => {
    const res = await app.request('/server-error');
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('Something went wrong');
    expect(json.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('should handle unknown errors with 500 status', async () => {
    const res = await app.request('/unknown-error');
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('Internal server error');
    expect(json.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
