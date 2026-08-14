import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { health } from '../health.route.js';

describe('Health Route', () => {
  const app = new Hono();
  app.route('/health', health);

  it('should return 200 OK with health status', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty('status', 'ok');
    expect(json.data).toHaveProperty('timestamp');
    expect(json.data).toHaveProperty('uptime');
  });

  it('should return valid timestamp', async () => {
    const res = await app.request('/health');
    const json = await res.json();

    const timestamp = new Date(json.data.timestamp);
    expect(timestamp.getTime()).not.toBeNaN();
    expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('should return positive uptime', async () => {
    const res = await app.request('/health');
    const json = await res.json();

    expect(json.data.uptime).toBeGreaterThan(0);
    expect(typeof json.data.uptime).toBe('number');
  });
});
