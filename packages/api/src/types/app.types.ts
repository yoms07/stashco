import type { Hono } from 'hono';

/** Hono context variables set by middleware. `address` is set by `requireAuth`. */
export interface Variables {
  address: string;
}

export type HonoEnv = { Variables: Variables };

export type AppType = Hono<HonoEnv>;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  details?: unknown;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
