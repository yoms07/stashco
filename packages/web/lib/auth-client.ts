import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth client instance.
 * Automatically handles sessions via HTTP-only cookies — no manual token management needed.
 *
 * Available methods:
 *   authClient.signIn.email({ email, password, callbackURL })
 *   authClient.signUp.email({ email, password, name, callbackURL })
 *   authClient.signOut()
 *   authClient.useSession()   ← React hook
 *   authClient.getSession()   ← async, for server components / route handlers
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
