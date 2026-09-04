import { z } from "zod";

export const ReplaceImageRequestSchema = z.object({
  baseDocumentId: z.string().min(1),
  expectedVersion: z.number().int().positive(),
  assetId: z.string().min(1),
});

export type ReplaceImageRequest = z.infer<typeof ReplaceImageRequestSchema>;
