import type { ChallengeResponse, Session } from '@stellar-ambassador/shared';

export type { ChallengeResponse, Session };

/** Session as consumed by the UI — same shape from /auth/me and /auth/verify. */
export type AuthSession = Session;
