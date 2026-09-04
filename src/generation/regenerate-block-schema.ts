import { z } from "zod";

/**
 * Blocks eligible for targeted Claude regeneration. Deliberately excludes
 * cta, footer, subject, and preheader — those are never regenerated per
 * Slice 6B scope.
 */
export const REGENERATE_ELIGIBLE_BLOCK_IDS = [
  "headline",
  "body",
  "event_details",
  "offer_details",
  "hero_image",
] as const;

export const RegenerateBlockRequestSchema = z.object({
  baseDocumentId: z.string().min(1),
  expectedVersion: z.number().int().positive(),
  blockId: z.enum(REGENERATE_ELIGIBLE_BLOCK_IDS),
});

export type RegenerateBlockRequest = z.infer<typeof RegenerateBlockRequestSchema>;
export type RegenerateEligibleBlockId = (typeof REGENERATE_ELIGIBLE_BLOCK_IDS)[number];
