import type { PayoutMeta } from '@prisma/client';
import type { PayoutMetaRequest } from '@stellar-ambassador/shared';
import { prisma } from '../config/database.js';
import { ForbiddenError, InternalServerError, NotFoundError } from '../lib/errors.js';
import { readClient } from '../lib/soroban.js';

/** Owner and approver, simulated fresh from the contract on every call — never cached (D-002).
 * A role baked into the session would go stale the moment `set_approver` rotates it. */
async function getRoles(): Promise<{ owner: string; approver: string }> {
  const client = readClient();
  const [ownerTx, approverTx] = await Promise.all([client.get_owner(), client.get_approver()]);
  if (ownerTx.result.isErr() || approverTx.result.isErr()) {
    throw new InternalServerError('Failed to read treasury owner/approver');
  }
  return { owner: ownerTx.result.unwrap(), approver: approverTx.result.unwrap() };
}

export class PayoutMetaService {
  /** Only the owner or approver may write metadata, and only for a request that actually
   * exists on-chain — otherwise the table accumulates orphans the listing endpoint would
   * have to reconcile. */
  static async upsert(
    address: string,
    requestId: number,
    data: PayoutMetaRequest
  ): Promise<PayoutMeta> {
    const { owner, approver } = await getRoles();
    if (address !== owner && address !== approver) {
      throw new ForbiddenError('Only the treasury owner or approver may write payout metadata');
    }

    const request = await readClient().get_request({ id: requestId });
    if (request.result.isErr()) {
      throw new NotFoundError(`Payout request ${requestId} not found`);
    }

    return prisma.payoutMeta.upsert({
      where: { requestId },
      create: { requestId, ...data },
      update: data,
    });
  }
}
