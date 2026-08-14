# CLAUDE.md — Frontend (`@stellar-ambassador/web`)

This file provides guidance to Claude Code when working in this package.

## Project Overview

Next.js 15 frontend with App Router, TanStack Query, Tailwind CSS, and shadcn/ui. Part of the `stellar-ambassador` monorepo.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript strict mode
- **Styling**: Tailwind CSS + shadcn/ui
- **Data Fetching**: TanStack Query (React Query v5)
- **Auth**: better-auth client (cookie-based sessions)
- **HTTP**: Custom `ApiClient` in `services/api/client.ts`

## Development Commands

```bash
pnpm dev          # Start dev server on http://localhost:3000
pnpm build        # Production build
pnpm typecheck    # Type checking
pnpm lint         # ESLint
```

## Project Structure

```
app/
├── layout.tsx          # Root layout (wraps with QueryProvider)
└── page.tsx            # Home page

components/
├── examples/           # Example components (delete or adapt)
└── ui/                 # shadcn/ui components (add via: npx shadcn add <component>)

lib/
├── utils.ts            # cn() utility (clsx + tailwind-merge)
└── auth-client.ts      # better-auth client — useSession, signIn, signUp, signOut

providers/
└── query-provider.tsx  # TanStack Query setup + ReactQueryDevtools

services/
├── api/
│   ├── client.ts       # ApiClient — fetch wrapper with credentials: 'include'
│   └── endpoints.ts    # API_ENDPOINTS constant
├── auth/
│   ├── auth.types.ts   # AuthUser, AuthSession, SignInInput, SignUpInput
│   ├── auth.hook.ts    # useSession, useSignIn, useSignUp, useSignOut
│   └── index.ts
└── users/
    ├── users.types.ts
    ├── users.queries.ts
    ├── users.service.ts
    └── users.hook.ts
```

## Architecture Patterns

### Adding a new API service

Follow the 4-file pattern in `services/`:

```
services/posts/
├── posts.types.ts    # TypeScript interfaces
├── posts.queries.ts  # React Query key factory
├── posts.service.ts  # Static service class with API calls
├── posts.hook.ts     # React Query hooks
└── index.ts          # Barrel export
```

**types.ts**
```typescript
export interface Post { id: string; title: string; }
export interface CreatePostInput { title: string; }
```

**queries.ts**
```typescript
export const postKeys = {
  all: ['posts'] as const,
  list: (params?: object) => [...postKeys.all, 'list', params] as const,
  detail: (id: string) => [...postKeys.all, 'detail', id] as const,
};
```

**service.ts**
```typescript
import { ApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';

export class PostService {
  static async getAll() { return ApiClient.get('/posts'); }
  static async create(data: CreatePostInput) { return ApiClient.post('/posts', data); }
}
```

**hook.ts**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function usePosts() {
  return useQuery({ queryKey: postKeys.list(), queryFn: PostService.getAll });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: PostService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: postKeys.all }),
  });
}
```

### Auth usage

```typescript
'use client';
import { useSession, useSignIn, useSignOut } from '@/services/auth';

export function ProfileButton() {
  const { data: session, isPending } = useSession();
  const signIn = useSignIn();
  const signOut = useSignOut();

  if (isPending) return <span>Loading...</span>;
  if (!session) return <button onClick={() => signIn({ email, password })}>Sign in</button>;

  return (
    <div>
      <span>{session.user.name}</span>
      <button onClick={signOut}>Sign out</button>
    </div>
  );
}
```

For direct better-auth access:
```typescript
import { authClient } from '@/lib/auth-client';
// authClient.signIn.email(), authClient.signUp.email(), authClient.signOut()
// authClient.useSession() — React hook
```

### Adding shadcn/ui components

```bash
npx shadcn add button
npx shadcn add input
npx shadcn add dialog
# Components are placed in components/ui/
```

### Client vs Server components

- Default: Server Components (no `'use client'`)
- Add `'use client'` when using: hooks, event handlers, browser APIs, TanStack Query, better-auth
- Keep data fetching in Server Components where possible for performance

### Environment variables

- `NEXT_PUBLIC_API_URL` — backend API URL (exposed to browser)
- All other secrets must NOT be prefixed with `NEXT_PUBLIC_`

## Type Sharing

Import shared types from the monorepo shared package:

```typescript
import type { User, CreateUser } from '@stellar-ambassador/shared';
import { UserSchema } from '@stellar-ambassador/shared';
```

## Best Practices

- Use `@/` path alias for all imports (configured in tsconfig.json)
- Never store auth tokens manually — better-auth uses HTTP-only cookies
- Use `useQuery` for reads, `useMutation` for writes
- Keep React Query cache keys in `*.queries.ts` files
- Use `cn()` from `@/lib/utils` for conditional class merging
