import { SignJWT, jwtVerify } from 'jose';
import { env } from '../config/env.js';

const secret = new TextEncoder().encode(env.SESSION_SECRET);
const ALG = 'HS256';

export const SESSION_COOKIE = 'sa_session';

/** Signs the 7-day session cookie. Payload: { sub: <G... address> }. */
export async function signSessionToken(address: string): Promise<string> {
  return new SignJWT({ sub: address })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

/** Returns the wallet address encoded in `sub`. Throws on missing/expired/invalid token. */
export async function verifySessionToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] });
  if (typeof payload.sub !== 'string' || !payload.sub) {
    throw new Error('Session payload missing sub');
  }
  return payload.sub;
}
