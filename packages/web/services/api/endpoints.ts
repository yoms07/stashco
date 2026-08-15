/**
 * API endpoint constants
 * Centralized API endpoint definitions for type safety and maintainability
 */

export const API_ENDPOINTS = {
  // Wallet auth
  auth: {
    challenge: '/auth/challenge',
    verify: '/auth/verify',
    logout: '/auth/logout',
    me: '/auth/me',
  },

  // Payouts
  payouts: {
    meta: (requestId: number) => `/payouts/${requestId}/meta`,
    pending: '/payouts/pending',
  },

  // Health check
  health: '/health',
} as const;
