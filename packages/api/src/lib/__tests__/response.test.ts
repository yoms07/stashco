import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { success, created, noContent, paginated, error } from '../response.js';

describe('Response Helpers', () => {
  const app = new Hono();

  app.get('/success', (c) => success(c, { message: 'OK' }));
  app.post('/created', (c) => created(c, { id: '123' }));
  app.delete('/no-content', (c) => noContent(c));
  app.get('/paginated', (c) =>
    paginated(c, [{ id: 1 }, { id: 2 }], 1, 10, 25)
  );
  app.get('/error', (c) => error(c, 'Something failed', 400, 'BAD_REQUEST'));

  it('should return success response with 200', async () => {
    const res = await app.request('/success');
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual({ message: 'OK' });
  });

  it('should return created response with 201', async () => {
    const res = await app.request('/created', { method: 'POST' });
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual({ id: '123' });
  });

  it('should return no content with 204', async () => {
    const res = await app.request('/no-content', { method: 'DELETE' });
    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
  });

  it('should return paginated response', async () => {
    const res = await app.request('/paginated');
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);
    expect(json.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: false,
    });
  });

  it('should return error response', async () => {
    const res = await app.request('/error');
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('Something failed');
    expect(json.code).toBe('BAD_REQUEST');
  });
});
