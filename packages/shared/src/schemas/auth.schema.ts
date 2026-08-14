import { z } from 'zod';

/**
 * Wallet auth: the connected Stellar address is the only identity. See docs/API_SPEC.md §1.
 */

export const StellarAddressSchema = z
  .string()
  .regex(/^G[A-Z2-7]{55}$/, 'Not a Stellar account address');

export const ChallengeRequestSchema = z.object({
  address: StellarAddressSchema,
});
export type ChallengeRequest = z.infer<typeof ChallengeRequestSchema>;

export const ChallengeResponseSchema = z.object({
  nonce: z.string(),
});
export type ChallengeResponse = z.infer<typeof ChallengeResponseSchema>;

export const VerifyRequestSchema = z.object({
  address: StellarAddressSchema,
  signature: z.string(),
});
export type VerifyRequest = z.infer<typeof VerifyRequestSchema>;

export const SessionSchema = z.object({
  address: z.string(),
});
export type Session = z.infer<typeof SessionSchema>;

export type VerifyResponse = Session;
export type MeResponse = Session;
