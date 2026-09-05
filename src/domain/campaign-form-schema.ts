import { z } from "zod";

import {
  CampaignFactsSchema,
  CampaignObjectiveSchema,
  CampaignTypeSchema,
  LayoutIdSchema,
  LifecycleStageSchema,
  NonEmptyStringSchema,
} from "@/domain/schemas";

const SegmentCardInputSchema = z.object({
  name: NonEmptyStringSchema,
  lifecycleStage: LifecycleStageSchema.optional(),
  primaryMotivation: NonEmptyStringSchema,
  primaryObjection: NonEmptyStringSchema,
  desiredAction: NonEmptyStringSchema,
  messagingNotes: z.string().optional(),
});

const CampaignImageInputSchema = z.object({
  assetId: NonEmptyStringSchema,
  altText: z.string().trim().optional(),
});

export const CampaignFormInputSchema = z.object({
  id: NonEmptyStringSchema.optional(),
  brandProfileId: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  campaignType: CampaignTypeSchema,
  objective: CampaignObjectiveSchema,
  brief: NonEmptyStringSchema,
  facts: CampaignFactsSchema,
  selectedLayoutId: LayoutIdSchema,
  images: z.array(CampaignImageInputSchema).max(3).default([]),
  segmentCard: SegmentCardInputSchema,
});

export type CampaignFormInput = z.infer<typeof CampaignFormInputSchema>;
