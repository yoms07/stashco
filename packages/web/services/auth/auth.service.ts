import { signMessage } from '@stellar/freighter-api';
import type { ApiResponse } from '@stellar-ambassador/shared';

import { ApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type { AuthSession, ChallengeResponse } from './auth.types';

/** ApiClient never throws; unwrap so React Query can treat failures as errors. */
function unwrap<T>(res: ApiResponse<T>): T {
  if (!res.success) throw new Error(res.error ?? 'Request failed');
  return res.data as T;
}

/** Browser-safe bytes -> base64, no Node `Buffer` dependency. */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export class AuthService {
  static async challenge(address: string): Promise<ChallengeResponse> {
    return unwrap(await ApiClient.post<ChallengeResponse>(API_ENDPOINTS.auth.challenge, { address }));
  }

  static async verify(address: string, signature: string): Promise<AuthSession> {
    return unwrap(
      await ApiClient.post<AuthSession>(API_ENDPOINTS.auth.verify, { address, signature }),
    );
  }

  static async logout(): Promise<void> {
    await ApiClient.post<void>(API_ENDPOINTS.auth.logout, {});
  }

  static async me(): Promise<AuthSession> {
    return unwrap(await ApiClient.get<AuthSession>(API_ENDPOINTS.auth.me));
  }

  /**
   * Full wallet-auth flow: challenge -> Freighter `signMessage` -> verify. Freighter's
   * return shape has changed across versions (v3: `Buffer | null`, v4+: `string`), so
   * normalize both to base64 — the API verifies SEP-53 framed bytes either way.
   */
  static async signIn(address: string): Promise<AuthSession> {
    const { nonce } = await this.challenge(address);
    const res = await signMessage(nonce, { address });
    if (res.error) throw new Error(res.error.message);

    const signature =
      typeof res.signedMessage === 'string'
        ? res.signedMessage
        : bytesToBase64(new Uint8Array(res.signedMessage ?? []));

    return this.verify(address, signature);
  }
}
