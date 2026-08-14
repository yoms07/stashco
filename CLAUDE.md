# CLAUDE.md — stellar-ambassador

This file provides guidance to Claude Code when working in this monorepo.

## Project Overview

**stellar-ambassador** is a TypeScript monorepo generated with create-monorepo.

Packages:
- `packages/api/` — Hono backend API (port 3001)
- `packages/web/` — Next.js frontend (port 3000)
- `packages/shared/` — Shared Zod schemas and TypeScript types

## Stack

- **Backend**: Hono, TypeScript, Zod, Prisma (postgres)
- **Frontend**: Next.js 15 App Router, TanStack Query, Tailwind CSS, shadcn/ui
- **Shared**: Zod schemas, inferred TypeScript types
- **Package Manager**: pnpm
- **Monorepo**: pnpm workspaces

## Development Commands

```bash
# Run everything
pnpm dev                         # Start all packages in parallel

# Individual packages
pnpm --filter api dev            # Backend only
pnpm --filter web dev            # Frontend only

# Build
pnpm build                       # Build all packages
pnpm --filter shared build       # Build shared first if types changed

# Quality
pnpm typecheck                   # Type-check all packages
pnpm lint                        # Lint all packages
pnpm format                      # Format all packages
```

## Package Dependency

```
packages/shared  ←  packages/api
                  ←  packages/web
```

> Always build `packages/shared` first after schema changes: `pnpm --filter shared build`

## Database

- **Provider**: PostgreSQL via Prisma
- Schema: `packages/api/prisma/schema.prisma`

```bash
pnpm --filter api prisma:generate   # Regenerate Prisma client
pnpm --filter api prisma:migrate    # Run migrations
pnpm --filter api prisma:studio     # Open Prisma Studio
```

## Environment Setup

```bash
cp packages/api/.env.example packages/api/.env
cp packages/web/.env.example packages/web/.env
```

Edit the `.env` files before running `pnpm dev`.

## Key Files

- `packages/api/src/index.ts` — Hono app entry point
- `packages/api/src/lib/errors.ts` — Custom error classes
- `packages/api/src/lib/response.ts` — Response helpers
- `packages/web/services/api/client.ts` — HTTP client
- `packages/web/services/api/endpoints.ts` — API endpoint constants
- `packages/web/lib/auth-client.ts` — better-auth client
- `packages/shared/src/index.ts` — All shared type exports

## Per-Package Guidance

Each package has its own `CLAUDE.md` with detailed patterns:
- `packages/api/CLAUDE.md` — routes, services, middleware, error handling
- `packages/web/CLAUDE.md` — services, hooks, auth, components
- `packages/shared/CLAUDE.md` — adding schemas and types
