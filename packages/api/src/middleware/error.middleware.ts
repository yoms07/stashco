import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { logger } from '../config/logger.js';
import { AppError } from '../lib/errors.js';
import type { ApiResponse } from '../types/app.types.js';

export function errorHandler(error: Error, c: Context) {
  // Handle known application errors
  if (error instanceof AppError) {
    logger.warn('Application error:', {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      path: c.req.path,
      method: c.req.method,
    });

    const response: ApiResponse = {
      success: false,
      error: error.message,
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? error.details : undefined,
    };

    return c.json(response, error.statusCode as ContentfulStatusCode);
  }

  // Handle unknown errors
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    path: c.req.path,
    method: c.req.method,
  });

  const response: ApiResponse = {
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined,
  };

  return c.json(response, 500);
}
