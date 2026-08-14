import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PayoutMetaService } from '../payout-meta.service.js';
import { readClient } from '../../lib/soroban.js';
import { prisma } from '../../config/database.js';
import { ForbiddenError, InternalServerError, NotFoundError } from '../../lib/errors.js';

vi.mock('../../lib/soroban.js', () => ({
  readClient: vi.fn(),
}));

vi.mock('../../config/database.js', () => ({
  prisma: {
    payoutMeta: {
      upsert: vi.fn(),
    },
  },
}));

const OWNER = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const APPROVER = 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBWHF';
const STRANGER = 'GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCWHF';

function mockClient(overrides: {
  owner?: { isErr: () => boolean; unwrap: () => string };
  approver?: { isErr: () => boolean; unwrap: () => string };
  request?: { isErr: () => boolean };
}) {
  const owner = overrides.owner ?? { isErr: () => false, unwrap: () => OWNER };
  const approver = overrides.approver ?? { isErr: () => false, unwrap: () => APPROVER };
  const request = overrides.request ?? { isErr: () => false };

  return {
    get_owner: vi.fn().mockResolvedValue({ result: owner }),
    get_approver: vi.fn().mockResolvedValue({ result: approver }),
    get_request: vi.fn().mockResolvedValue({ result: request }),
  };
}

describe('PayoutMetaService.upsert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('re-reads owner and approver from the contract on every call, never memoized', async () => {
    const client = mockClient({});
    vi.mocked(readClient).mockReturnValue(
      client as unknown as ReturnType<typeof readClient>
    );
    vi.mocked(prisma.payoutMeta.upsert).mockResolvedValue({} as never);

    await PayoutMetaService.upsert(OWNER, 1, { vendorName: 'Acme' });
    await PayoutMetaService.upsert(OWNER, 1, { vendorName: 'Acme' });

    expect(client.get_owner).toHaveBeenCalledTimes(2);
    expect(client.get_approver).toHaveBeenCalledTimes(2);
  });

  it('allows the owner to write metadata', async () => {
    const client = mockClient({});
    vi.mocked(readClient).mockReturnValue(
      client as unknown as ReturnType<typeof readClient>
    );
    vi.mocked(prisma.payoutMeta.upsert).mockResolvedValue({ requestId: 1 } as never);

    const result = await PayoutMetaService.upsert(OWNER, 1, { vendorName: 'Acme' });
    expect(result).toEqual({ requestId: 1 });
  });

  it('allows the approver to write metadata', async () => {
    const client = mockClient({});
    vi.mocked(readClient).mockReturnValue(
      client as unknown as ReturnType<typeof readClient>
    );
    vi.mocked(prisma.payoutMeta.upsert).mockResolvedValue({ requestId: 1 } as never);

    await expect(
      PayoutMetaService.upsert(APPROVER, 1, { vendorName: 'Acme' })
    ).resolves.toBeDefined();
  });

  it('rejects a caller who is neither owner nor approver', async () => {
    const client = mockClient({});
    vi.mocked(readClient).mockReturnValue(
      client as unknown as ReturnType<typeof readClient>
    );

    await expect(PayoutMetaService.upsert(STRANGER, 1, { vendorName: 'Acme' })).rejects.toThrow(
      ForbiddenError
    );
    expect(prisma.payoutMeta.upsert).not.toHaveBeenCalled();
  });

  it('rejects an unknown requestId rather than storing it', async () => {
    const client = mockClient({ request: { isErr: () => true } });
    vi.mocked(readClient).mockReturnValue(
      client as unknown as ReturnType<typeof readClient>
    );

    await expect(PayoutMetaService.upsert(OWNER, 999, { vendorName: 'Acme' })).rejects.toThrow(
      NotFoundError
    );
    expect(prisma.payoutMeta.upsert).not.toHaveBeenCalled();
  });

  it('throws when the owner/approver contract read fails', async () => {
    const client = mockClient({ owner: { isErr: () => true, unwrap: () => '' } });
    vi.mocked(readClient).mockReturnValue(
      client as unknown as ReturnType<typeof readClient>
    );

    await expect(PayoutMetaService.upsert(OWNER, 1, { vendorName: 'Acme' })).rejects.toThrow(
      InternalServerError
    );
    expect(prisma.payoutMeta.upsert).not.toHaveBeenCalled();
  });
});
