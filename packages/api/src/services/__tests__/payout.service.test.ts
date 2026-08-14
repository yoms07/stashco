import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PayoutService } from '../payout.service.js';
import { readClient } from '../../lib/soroban.js';
import { prisma } from '../../config/database.js';
import { InternalServerError } from '../../lib/errors.js';

vi.mock('../../lib/soroban.js', () => ({
  readClient: vi.fn(),
}));

vi.mock('../../config/database.js', () => ({
  prisma: {
    payoutMeta: {
      findMany: vi.fn(),
    },
  },
}));

const DESTINATION = 'GBL4TKOXBNQOXFPHBPZQTWJS5UWROHNS2U6PIDDNLGFKCQUWN2MANEUY';

function okRequest(overrides: {
  amount: bigint;
  destination: string;
  memo: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}) {
  return {
    isErr: () => false,
    unwrap: () => ({
      amount: overrides.amount,
      destination: overrides.destination,
      memo: overrides.memo,
      status: { tag: overrides.status },
    }),
  };
}

function mockClient(nextId: number, requests: ReturnType<typeof okRequest>[]) {
  return {
    next_request_id: vi.fn().mockResolvedValue({ result: nextId }),
    get_request: vi.fn().mockImplementation(({ id }: { id: number }) =>
      Promise.resolve({ result: requests[id] })
    ),
  };
}

describe('PayoutService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all on-chain requests with null vendor fields when no metadata exists', async () => {
    const requests = [
      okRequest({ amount: 50000000n, destination: DESTINATION, memo: 'invoice 1042 acme', status: 'Approved' }),
      okRequest({ amount: 25000000n, destination: DESTINATION, memo: 'invoice 1043 globex', status: 'Pending' }),
      okRequest({ amount: 12500000n, destination: DESTINATION, memo: 'invoice 1044 initech', status: 'Pending' }),
    ];
    vi.mocked(readClient).mockReturnValue(
      mockClient(3, requests) as unknown as ReturnType<typeof readClient>
    );
    vi.mocked(prisma.payoutMeta.findMany).mockResolvedValue([]);

    const result = await PayoutService.getAll();

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      id: 0,
      destination: DESTINATION,
      amount: '50000000',
      memo: 'invoice 1042 acme',
      status: 'Approved',
      vendorName: null,
      invoiceRef: null,
      note: null,
    });
    expect(result.every((p) => p.vendorName === null)).toBe(true);
  });

  it('left-joins metadata onto the matching request without dropping requests that have none', async () => {
    const requests = [
      okRequest({ amount: 50000000n, destination: DESTINATION, memo: 'm0', status: 'Approved' }),
      okRequest({ amount: 25000000n, destination: DESTINATION, memo: 'm1', status: 'Pending' }),
      okRequest({ amount: 12500000n, destination: DESTINATION, memo: 'm2', status: 'Pending' }),
    ];
    vi.mocked(readClient).mockReturnValue(
      mockClient(3, requests) as unknown as ReturnType<typeof readClient>
    );
    vi.mocked(prisma.payoutMeta.findMany).mockResolvedValue([
      {
        id: 'abc',
        requestId: 1,
        vendorName: 'Globex',
        invoiceRef: 'INV-1043',
        note: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never);

    const result = await PayoutService.getAll();

    expect(result[0].vendorName).toBeNull();
    expect(result[1].vendorName).toBe('Globex');
    expect(result[1].invoiceRef).toBe('INV-1043');
    expect(result[2].vendorName).toBeNull();
  });

  it('returns an empty array when next_request_id is 0', async () => {
    vi.mocked(readClient).mockReturnValue(
      mockClient(0, []) as unknown as ReturnType<typeof readClient>
    );
    vi.mocked(prisma.payoutMeta.findMany).mockResolvedValue([]);

    const result = await PayoutService.getAll();
    expect(result).toEqual([]);
  });

  it('getPending filters to only Pending requests', async () => {
    const requests = [
      okRequest({ amount: 50000000n, destination: DESTINATION, memo: 'm0', status: 'Approved' }),
      okRequest({ amount: 25000000n, destination: DESTINATION, memo: 'm1', status: 'Pending' }),
      okRequest({ amount: 12500000n, destination: DESTINATION, memo: 'm2', status: 'Pending' }),
    ];
    vi.mocked(readClient).mockReturnValue(
      mockClient(3, requests) as unknown as ReturnType<typeof readClient>
    );
    vi.mocked(prisma.payoutMeta.findMany).mockResolvedValue([]);

    const result = await PayoutService.getPending();
    expect(result.map((p) => p.id)).toEqual([1, 2]);
    expect(result.every((p) => p.status === 'Pending')).toBe(true);
  });

  it('throws when a request in range is unexpectedly missing on-chain', async () => {
    vi.mocked(readClient).mockReturnValue(
      mockClient(1, [{ isErr: () => true, unwrap: () => { throw new Error('unreachable'); } }]) as unknown as ReturnType<
        typeof readClient
      >
    );
    vi.mocked(prisma.payoutMeta.findMany).mockResolvedValue([]);

    await expect(PayoutService.getAll()).rejects.toThrow(InternalServerError);
  });
});
