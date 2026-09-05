import { z } from "zod";

import { LayoutIdSchema } from "@/domain/schemas";

export const SwitchLayoutRequestSchema = z.object({
  baseDocumentId: z.string().min(1),
  expectedVersion: z.number().int().positive(),
  targetLayoutId: LayoutIdSchema,
});

export type SwitchLayoutRequest = z.infer<typeof SwitchLayoutRequestSchema>;
