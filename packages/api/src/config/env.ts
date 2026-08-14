import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Session signing (wallet auth). Dev-only fallback below — set a real secret in .env
  // for anything beyond local development.
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters')
    .default('dev-only-insecure-secret-change-me-please'),

  // Stellar / Soroban — unprefixed equivalents of the web app's NEXT_PUBLIC_* vars
  STELLAR_NETWORK: z.string().default('testnet'),
  SOROBAN_RPC_URL: z.string().default('https://soroban-testnet.stellar.org'),
  TREASURY_CONTRACT_ID: z.string().optional(),

  // Server keypair (secret seed, S...) for calls the backend submits on users' behalf.
  // Needs XLM for fees. Testnet only; leave unset to disable those endpoints.
  SERVER_SIGNER_SECRET: z.string().optional(),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
