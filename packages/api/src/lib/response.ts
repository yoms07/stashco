import type { Context } from 'hono';
import type { StatusCode } from 'hono/utils/http-status';
import type { ApiResponse } from '../types/app.types.js';

/**
 * Success response helper
 */
export function success<T>(c: Context, data: T, statusCode: StatusCode = 200) {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  return c.json(response, statusCode);
}

/**
 * Error response helper
 */
export function error(
  c: Context,
  message: string,
  statusCode: StatusCode = 500,
  code?: string,
  details?: unknown
) {
  const response: ApiResponse = {
    success: false,
    error: message,
    code,
    details: process.env.NODE_ENV === 'development' ? details : undefined,
  };
  return c.json(response, statusCode);
}

/**
 * Created response (201)
 */
export function created<T>(c: Context, data: T) {
  return success(c, data, 201);
}

/**
 * No content response (204)
 */
export function noContent(c: Context) {
  return c.body(null, 204);
}

/**
 * Paginated response helper
 */
export function paginated<T>(
  c: Context,
  data: T[],
  page: number,
  limit: number,
  total: number
) {
  const response = {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
  return c.json(response);
}
