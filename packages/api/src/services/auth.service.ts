import { randomBytes } from 'node:crypto';
import { prisma } from '../config/database.js';
import { BadRequestError, UnauthorizedError } from '../lib/errors.js';
import { verifyWalletSignature } from '../lib/wallet-signature.js';

const NONCE_TTL_MS = 5 * 60 * 1000;

function buildNonceMessage(address: string, random: string, expiresAt: Date): string {
  return `Sign in to stellar-ambassador.\n\nAddress: ${address}\nNonce: ${random}\nExpires: ${expiresAt.toISOString()}`;
}

export class AuthService {
  /** Persists a single-use nonce for `address` and returns the exact string to sign. */
  static async challenge(address: string): Promise<{ nonce: string }> {
    const random = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + NONCE_TTL_MS);
    const nonce = buildNonceMessage(address, random, expiresAt);

    await prisma.nonce.create({ data: { wallet: address, nonce, expiresAt } });

    return { nonce };
  }

  /** Verifies the Ed25519 signature over the outstanding nonce and burns it. */
  static async verify(address: string, signature: string): Promise<{ address: string }> {
    const record = await prisma.nonce.findFirst({
      where: { wallet: address, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) {
      throw new BadRequestError('Unknown, expired, or already-used nonce');
    }

    if (!verifyWalletSignature(address, record.nonce, signature)) {
      throw new UnauthorizedError('Invalid signature');
    }

    await prisma.nonce.update({ where: { id: record.id }, data: { usedAt: new Date() } });

    return { address };
  }

  static async me(address: string): Promise<{ address: string }> {
    return { address };
  }
}
