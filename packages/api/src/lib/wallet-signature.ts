import { Keypair, hash } from '@stellar-ambassador/contract-client';

/**
 * Verifies a Freighter `signMessage` signature against a Stellar address.
 *
 * Freighter does not sign the raw message bytes. It applies SEP-53 framing first:
 *   payload = "Stellar Signed Message:\n" + message   (UTF-8)
 *   digest  = SHA-256(payload)
 *   sig     = Ed25519.sign(digest)
 * and returns `sig` as a base64 string.
 */
const SEP53_PREFIX = 'Stellar Signed Message:\n';

export function verifyWalletSignature(
  address: string,
  message: string,
  signatureBase64: string,
): boolean {
  const payload = Buffer.concat([
    Buffer.from(SEP53_PREFIX, 'utf-8'),
    Buffer.from(message, 'utf-8'),
  ]);
  const digest = hash(payload);

  let signature: Buffer;
  try {
    signature = Buffer.from(signatureBase64, 'base64');
  } catch {
    return false;
  }

  try {
    return Keypair.fromPublicKey(address).verify(digest, signature);
  } catch {
    // Malformed address or signature length -> not a valid signature, not a crash.
    return false;
  }
}
