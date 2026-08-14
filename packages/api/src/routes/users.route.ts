import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { UserService } from '../services/user.service.js';
import { success, created, noContent, paginated } from '../lib/response.js';
import { CreateUserSchema, UpdateUserSchema } from '@stellar-ambassador/shared';

const users = new Hono();

// Query params schema for pagination
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// Query params schema for search
const searchSchema = paginationSchema.extend({
  q: z.string().min(1),
});

/**
 * GET /users - List all users
 */
users.get('/', zValidator('query', paginationSchema), async (c) => {
  const { page, limit } = c.req.valid('query');
  const result = await UserService.getAll(page, limit);

  return paginated(c, result.users, page, limit, result.total);
});

/**
 * GET /users/search - Search users
 */
users.get('/search', zValidator('query', searchSchema), async (c) => {
  const { q, page, limit } = c.req.valid('query');
  const result = await UserService.search(q, page, limit);

  return paginated(c, result.users, page, limit, result.total);
});

/**
 * GET /users/:id - Get user by ID
 */
users.get('/:id', async (c) => {
  const id = c.req.param('id');
  const user = await UserService.getById(id);

  return success(c, user);
});

/**
 * POST /users - Create new user
 */
users.post('/', zValidator('json', CreateUserSchema), async (c) => {
  const data = c.req.valid('json');
  const user = await UserService.create(data);

  return created(c, user);
});

/**
 * PATCH /users/:id - Update user
 */
users.patch('/:id', zValidator('json', UpdateUserSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const user = await UserService.update(id, data);

  return success(c, user);
});

/**
 * DELETE /users/:id - Delete user
 */
users.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await UserService.delete(id);

  return noContent(c);
});

export { users };
