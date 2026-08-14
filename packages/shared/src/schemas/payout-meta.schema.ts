import { z } from 'zod';

/**
 * Off-chain vendor metadata for an on-chain payout request (D-003). The chain owns
 * destination, amount and status — this is free text with no contract logic behind it.
 */
export const PayoutMetaRequestSchema = z.object({
  vendorName: z.string().min(1),
  invoiceRef: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
});
export type PayoutMetaRequest = z.infer<typeof PayoutMetaRequestSchema>;

export const PayoutMetaSchema = z.object({
  id: z.string(),
  requestId: z.number().int(),
  vendorName: z.string(),
  invoiceRef: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type PayoutMeta = z.infer<typeof PayoutMetaSchema>;
