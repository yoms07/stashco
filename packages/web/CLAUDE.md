# CLAUDE.md — Frontend (`@stellar-ambassador/web`)

This file provides guidance to Claude Code when working in this package.

## Project Overview

Next.js 15 frontend with App Router, TanStack Query, Tailwind CSS, and shadcn/ui. Part of the `stellar-ambassador` monorepo.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript strict mode
- **Styling**: Tailwind CSS + shadcn/ui
- **Data Fetching**: TanStack Query (React Query v5)
- **Wallet / Auth**: Freighter (`@stellar/freighter-api`) — the wallet is the identity;
  the API session is an HTTP-only cookie obtained by signing a nonce
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
├── layout.tsx          # Root layout (QueryProvider > WalletProvider)
└── page.tsx            # Home page — connect + sign in

components/
├── wallet/
│   └── connect-wallet-button.tsx
└── ui/                 # shadcn/ui components (add via: npx shadcn add <component>)

lib/
├── utils.ts            # cn() utility (clsx + tailwind-merge)
├── stellar.ts          # network config from NEXT_PUBLIC_* + explorer URLs
└── contracts.ts        # contract client bound to the connected wallet for signing

providers/
├── query-provider.tsx  # TanStack Query setup + ReactQueryDevtools
└── wallet-provider.tsx # <WalletProvider> + useWallet() — Freighter connect/restore/watch

services/
├── api/
│   ├── client.ts       # ApiClient — fetch wrapper with credentials: 'include'
│   └── endpoints.ts    # API_ENDPOINTS constant
└── auth/
    ├── auth.types.ts   # AuthSession
    ├── auth.queries.ts # query keys, prefixed by wallet address
    ├── auth.service.ts # challenge -> signMessage -> verify
    ├── auth.hook.ts    # useMe, useSignIn, useSignOut
    └── index.ts
```

Query keys are prefixed with the wallet address so a Freighter account switch invalidates
everything automatically.

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

### Wallet + auth usage

Two steps, on purpose: connecting is local to the extension, signing in is what the API trusts.

```typescript
'use client';
import { useWallet } from '@/providers/wallet-provider';
import { useMe, useSignIn, useSignOut } from '@/services/auth';

export function ProfileButton() {
  const { isConnected, address, restoring, connect } = useWallet();
  const { data: session } = useMe();
  const signIn = useSignIn();
  const signOut = useSignOut();

  if (restoring) return <span>Loading…</span>;
  if (!isConnected) return <button onClick={connect}>Connect Freighter</button>;
  if (!session) return <button onClick={() => signIn.mutate()}>Sign in</button>;

  return (
    <div>
      <span>{session.address}</span>
      <button onClick={() => signOut.mutate()}>Sign out</button>
    </div>
  );
}
```

Anything that branches on `isConnected` must wait on `restoring` first, or a returning user
flashes through the "connect wallet" state.

### Calling a contract

```typescript
import { getAmbassadorClient } from '@/lib/contracts';

const client = getAmbassadorClient(address);   // omit address for read-only simulation
const tx = await client.bump({ caller: address });
const { result } = await tx.signAndSend();
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
