import type { Payout } from '@stashco/shared';
import { prisma } from '../config/database.js';
import { InternalServerError } from '../lib/errors.js';
import { readClient } from '../lib/soroban.js';

export class PayoutService {
  /** The chain is authoritative for existence and status; `PayoutMeta` is a LEFT join — a
   * request with no metadata row still appears, with null vendor fields (D-003). Walking
   * ids 0..next_request_id() is fine at demo scale; cache on next_request_id if it gets slow,
   * never persist request state to Postgres. */
  static async getAll(): Promise<Payout[]> {
    const client = readClient();
    const nextIdTx = await client.next_request_id();
    const nextId = nextIdTx.result;

    const ids = Array.from({ length: nextId }, (_, id) => id);
    const requestTxs = await Promise.all(ids.map((id) => client.get_request({ id })));

    const metas = await prisma.payoutMeta.findMany({
      where: { requestId: { in: ids } },
    });
    const metaByRequestId = new Map(metas.map((meta) => [meta.requestId, meta]));

    return requestTxs.map((tx, id) => {
      if (tx.result.isErr()) {
        throw new InternalServerError(
          `Payout request ${id} not found despite id < next_request_id`
        );
      }
      const request = tx.result.unwrap();
      const meta = metaByRequestId.get(id);
      return {
        id,
        destination: request.destination,
        amount: request.amount.toString(),
        memo: request.memo,
        status: request.status.tag,
        vendorName: meta?.vendorName ?? null,
        invoiceRef: meta?.invoiceRef ?? null,
        note: meta?.note ?? null,
      };
    });
  }

  static async getPending(): Promise<Payout[]> {
    const all = await PayoutService.getAll();
    return all.filter((payout) => payout.status === 'Pending');
  }
}
