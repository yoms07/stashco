# CLAUDE.md — Backend API (`@stellar-ambassador/api`)

This file provides guidance to Claude Code when working in this package.

## Project Overview

This is a Hono-based backend API in a monorepo workspace. It's designed for high performance, full type safety, and production-ready patterns.

## Tech Stack

- **Framework**: Hono (lightweight, fast, type-safe)
- **Language**: TypeScript with strict mode
- **Runtime**: Node.js (compatible with Bun, Deno, Cloudflare Workers)
- **Validation**: Zod schemas
- **Logger**: Winston with structured logging
- **Build Tool**: tsup (fast ESM bundler)
- **Testing**: Vitest with coverage

## Development Commands

```bash
# Development
pnpm dev              # Start with hot reload
pnpm build            # Build for production
pnpm start            # Run production build
pnpm test             # Run tests
pnpm test:watch       # Watch mode
pnpm test:coverage    # Coverage report
pnpm typecheck        # Type checking
```

## Project Structure

```
src/
├── config/           # Configuration (env, logger, db)
├── lib/              # Utilities and helpers
│   ├── errors.ts     # Custom error classes
│   └── response.ts   # Response helpers
├── middleware/       # Hono middleware
│   ├── cors.middleware.ts
│   ├── error.middleware.ts
│   ├── logger.middleware.ts
│   └── rate-limit.middleware.ts
├── routes/           # API route handlers
│   └── health.route.ts
├── services/         # Business logic (if database enabled)
├── types/            # TypeScript types
└── index.ts          # App entry point
```

## Architecture Patterns

### Error Handling

Use custom error classes for consistent error responses:

```typescript
import { NotFoundError, BadRequestError } from '../lib/errors.js';

// Throw custom errors - they're automatically handled
throw new NotFoundError('User not found');
throw new BadRequestError('Invalid email format');
```

Available errors:
- `BadRequestError` (400)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `ValidationError` (422)
- `TooManyRequestsError` (429)
- `InternalServerError` (500)

### Response Helpers

Use standardized response helpers:

```typescript
import { success, created, noContent, paginated } from '../lib/response.js';

// Success response (200)
return success(c, { id: '123', name: 'John' });

// Created response (201)
return created(c, newUser);

// No content (204)
return noContent(c);

// Paginated response
return paginated(c, users, page, limit, total);
```

### Route Structure

Follow this pattern for new routes:

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { success } from '../lib/response.js';
import { CreateItemSchema } from '@stellar-ambassador/shared';

const items = new Hono();

// List items with pagination
items.get('/', zValidator('query', paginationSchema), async (c) => {
  const { page, limit } = c.req.valid('query');
  const result = await ItemService.getAll(page, limit);
  return paginated(c, result.items, page, limit, result.total);
});

// Get by ID
items.get('/:id', async (c) => {
  const id = c.req.param('id');
  const item = await ItemService.getById(id);
  return success(c, item);
});

// Create
items.post('/', zValidator('json', CreateItemSchema), async (c) => {
  const data = c.req.valid('json');
  const item = await ItemService.create(data);
  return created(c, item);
});

export { items };
```

### Service Layer Pattern

Create services for business logic:

```typescript
import { prisma } from '../config/database.js';
import { NotFoundError, ConflictError } from '../lib/errors.js';

export class ItemService {
  static async getAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.item.findMany({ skip, take: limit }),
      prisma.item.count(),
    ]);
    return { items, total, page, limit };
  }

  static async getById(id: string) {
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) throw new NotFoundError(`Item ${id} not found`);
    return item;
  }

  static async create(data: CreateItem) {
    // Check for duplicates
    const existing = await prisma.item.findUnique({ where: { name: data.name } });
    if (existing) throw new ConflictError('Item already exists');

    return prisma.item.create({ data });
  }
}
```

### Environment Variables

All env vars are validated with Zod in `src/config/env.ts`. Add new variables:

```typescript
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  // Add your vars here
  NEW_VAR: z.string().min(1),
});
```

### Rate Limiting

Apply rate limiting to routes:

```typescript
import { rateLimits } from '../middleware/rate-limit.middleware.js';

// Use preset limits
app.use('/api/*', rateLimits.standard); // 100 req/min

// Custom limit
app.use('/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts',
}));
```

### Testing

Write tests for all routes and services:

```typescript
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { items } from '../items.route.js';

describe('Items Route', () => {
  const app = new Hono();
  app.route('/items', items);

  it('should list items', async () => {
    const res = await app.request('/items?page=1&limit=10');
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeInstanceOf(Array);
    expect(json.pagination).toBeDefined();
  });
});
```

## Database (if enabled)

### Prisma Commands

```bash
pnpm prisma:generate   # Generate Prisma client
pnpm prisma:migrate    # Create and run migrations
pnpm prisma:studio     # Open Prisma Studio UI
pnpm prisma:push       # Push schema to database
```

### Creating Migrations

```bash
# After editing schema.prisma
pnpm prisma:migrate
# Enter migration name when prompted
```

## Type Sharing

Import shared types from the shared package:

```typescript
import { User, CreateUser, UpdateUser } from '@stellar-ambassador/shared';
import { UserSchema } from '@stellar-ambassador/shared';

// Use schemas for validation
const result = UserSchema.parse(data);

// Use types for type safety
const user: User = await getUser(id);
```

## Best Practices

### DO:
- ✅ Use custom error classes, not raw `throw new Error()`
- ✅ Use response helpers for all routes
- ✅ Validate all input with Zod schemas
- ✅ Put business logic in services, not routes
- ✅ Write tests for new features
- ✅ Use type-safe imports from shared package
- ✅ Log important operations with structured logging
- ✅ Handle async operations properly with try/catch

### DON'T:
- ❌ Don't return raw `c.json()` - use response helpers
- ❌ Don't put business logic in routes - use services
- ❌ Don't use `any` type - maintain type safety
- ❌ Don't skip validation - always validate input
- ❌ Don't commit `.env` files - use `.env.example`
- ❌ Don't use blocking operations in async handlers
- ❌ Don't modify shared types here - edit in `packages/shared`

## Common Tasks

### Adding a New Route

1. Create route file in `src/routes/`
2. Create service in `src/services/` (if needed)
3. Add validation schemas in `packages/shared/src/schemas/`
4. Register route in `src/index.ts`
5. Write tests in `src/routes/__tests__/`

### Adding Middleware

1. Create in `src/middleware/`
2. Export middleware function
3. Apply in `src/index.ts` with `app.use()`

### Adding Environment Variables

1. Add to `.env.example`
2. Add to `src/config/env.ts` schema
3. Use via `env.YOUR_VAR`

## Debugging

```typescript
// Use structured logging
import { logger } from './config/logger.js';

logger.info('User logged in', { userId: user.id });
logger.warn('Rate limit approaching', { ip, count });
logger.error('Database error', { error, query });
```

## Performance Tips

- Use database indexes for frequently queried fields
- Use pagination for list endpoints
- Cache expensive operations with Redis (if enabled)
- Use `prisma.$transaction()` for multiple related operations
- Profile with `pnpm test:coverage` to find slow tests

## Authentication (better-auth)

If auth is enabled, the project uses [better-auth](https://better-auth.com) with cookie-based sessions.

### How it works

- All auth routes are mounted at `/api/auth/**` — handled automatically by better-auth
- Sessions are stored in the database (Prisma adapter)
- Cookies are HTTP-only — no manual token management

### Protecting routes

```typescript
import { requireAuth, optionalAuth } from '../middleware/auth.middleware.js';

// Require a valid session
app.get('/profile', requireAuth, (c) => {
  const session = c.get('session'); // { user: User, session: Session }
  return success(c, session.user);
});

// Attach session if present, but don't block
app.get('/feed', optionalAuth, (c) => {
  const session = c.get('session'); // null if not logged in
  ...
});
```

### Prisma schema

The schema includes `user`, `session`, `account`, and `verification` tables managed by better-auth. Do not modify them manually — run `npx better-auth generate` if you change `src/lib/auth.ts`.

### Auth environment variables

```
BETTER_AUTH_SECRET=...   # min 32 chars
BETTER_AUTH_URL=...      # your API URL, e.g. http://localhost:3001
```

## Security Checklist

- [ ] All inputs are validated with Zod
- [ ] Rate limiting is applied to sensitive endpoints
- [ ] Sensitive data is not logged
- [ ] Database queries use parameterized queries (Prisma does this)
- [ ] CORS is configured correctly
- [ ] Environment variables are validated on startup
- [ ] Error messages don't leak sensitive info in production
