/**
 * Auth hooks — thin wrappers around better-auth's React client.
 *
 * For full better-auth client access, import directly from @/lib/auth-client.
 */

'use client';

import { useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import type { SignInInput, SignUpInput } from './auth.types';

/**
 * Hook to get the current session.
 * Returns { data: AuthSession | null, isPending, error }
 */
export function useSession() {
  return authClient.useSession();
}

/**
 * Hook to sign in with email and password.
 */
export function useSignIn() {
  const queryClient = useQueryClient();

  return async (input: SignInInput) => {
    const result = await authClient.signIn.email(input);
    if (!result.error) {
      await queryClient.invalidateQueries();
    }
    return result;
  };
}

/**
 * Hook to register a new account.
 */
export function useSignUp() {
  const queryClient = useQueryClient();

  return async (input: SignUpInput) => {
    const result = await authClient.signUp.email(input);
    if (!result.error) {
      await queryClient.invalidateQueries();
    }
    return result;
  };
}

/**
 * Hook to sign out.
 */
export function useSignOut() {
  const queryClient = useQueryClient();

  return async () => {
    await authClient.signOut();
    queryClient.clear();
  };
}
