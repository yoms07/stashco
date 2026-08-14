import { z } from 'zod';

/**
 * A payout request as the approver's inbox sees it: on-chain facts left-joined with
 * off-chain `PayoutMeta` (D-003). Chain data is authoritative for existence and status —
 * vendor fields are null when no metadata row exists yet.
 */
export const RequestStatusSchema = z.enum(['Pending', 'Approved', 'Rejected']);
export type RequestStatusValue = z.infer<typeof RequestStatusSchema>;

export const PayoutSchema = z.object({
  id: z.number().int(),
  destination: z.string(),
  amount: z.string(),
  memo: z.string(),
  status: RequestStatusSchema,
  vendorName: z.string().nullable(),
  invoiceRef: z.string().nullable(),
  note: z.string().nullable(),
});
export type Payout = z.infer<typeof PayoutSchema>;
