# CLAUDE.md — Shared Package (`@stellar-ambassador/shared`)

This file provides guidance to Claude Code when working in this package.

## Overview

Shared TypeScript types and Zod schemas used by both the backend API and frontend web app. This is the single source of truth for data shapes across the monorepo.

## Structure

```
src/
├── index.ts           # Barrel export — everything exported from here
├── types.ts           # Shared TypeScript interfaces (ApiResponse, PaginatedResponse)
└── schemas/
    └── user.schema.ts # Zod schemas + inferred types for User domain
```

## Development Commands

```bash
pnpm build        # Build (required before other packages can consume it)
pnpm typecheck    # Type check
```

> **Important**: Run `pnpm build` after changes so backend and frontend pick up the latest types.

## Adding New Schemas

Create a new file in `src/schemas/`:

```typescript
// src/schemas/post.schema.ts
import { z } from 'zod';

export const PostSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().nullable(),
  authorId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Post = z.infer<typeof PostSchema>;

export const CreatePostSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  authorId: z.string(),
});
export type CreatePost = z.infer<typeof CreatePostSchema>;

export const UpdatePostSchema = CreatePostSchema.partial();
export type UpdatePost = z.infer<typeof UpdatePostSchema>;
```

Then re-export from `src/index.ts`:

```typescript
export * from './schemas/post.schema.js';
```

## Consuming in Backend

```typescript
import { PostSchema, type CreatePost } from '@stellar-ambassador/shared';
import { zValidator } from '@hono/zod-validator';

posts.post('/', zValidator('json', CreatePostSchema), async (c) => {
  const data = c.req.valid('json'); // typed as CreatePost
});
```

## Consuming in Frontend

```typescript
import type { Post, CreatePost } from '@stellar-ambassador/shared';
import { PostSchema } from '@stellar-ambassador/shared';

// In service
export class PostService {
  static async getAll(): Promise<ApiResponse<Post[]>> {
    return ApiClient.get('/posts');
  }
}
```

## Rules

- Only pure TypeScript / Zod — no framework-specific code
- No runtime dependencies other than `zod`
- Always export both the Zod schema AND the inferred TypeScript type
- Schema names: `UserSchema` / Type names: `User` (no suffix)
- Use `.nullable()` not `.optional()` for fields that can be null in the DB
- Use `.coerce.date()` for `DateTime` fields from Prisma
