/**
 * Payouts service exports — the two-wallet story: the owner queues a payout and saves its
 * vendor name off-chain, the approver sees it in their inbox and approves or rejects it.
 *
 *   import { useIsOwner, useRequestPayout, useSubmitPayoutMeta, usePayoutRequest } from '@/services/payouts';
 *   import { useIsApprover, usePendingPayouts, useApprovePayout, useRejectPayout } from '@/services/payouts';
 */

export * from './payouts.types';
export * from './payouts.queries';
export * from './payouts.service';
export * from './payouts.hook';
