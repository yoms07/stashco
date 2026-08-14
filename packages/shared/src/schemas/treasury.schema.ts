import { z } from 'zod';

/**
 * Treasury position: i128 at 7 decimals. Kept as a string end to end — a JS number cannot
 * hold the range and the deltas that matter here (stroops of yield) are exactly what a
 * parseFloat would destroy.
 */
export const PositionSchema = z.object({
  positionUsdc: z.string(),
});
export type Position = z.infer<typeof PositionSchema>;

export const PositionSnapshotSchema = z.object({
  id: z.string(),
  capturedAt: z.coerce.date(),
  positionUsdc: z.string(),
  createdAt: z.coerce.date(),
});
export type PositionSnapshot = z.infer<typeof PositionSnapshotSchema>;

export const PositionHistorySchema = z.array(PositionSnapshotSchema);
export type PositionHistory = z.infer<typeof PositionHistorySchema>;
