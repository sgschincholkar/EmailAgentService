import { z } from "zod";

import {
  CampaignObjectiveSchema,
  CampaignTypeSchema,
  HttpUrlSchema,
  LayoutIdSchema,
  NonEmptyStringSchema,
  TimestampSchema,
} from "./common";

const OptionalFactSchema = NonEmptyStringSchema.optional();

export const CampaignFactsSchema = z.object({
  productOrFeatureName: OptionalFactSchema,
  offerText: OptionalFactSchema,
  priceText: OptionalFactSchema,
  discountText: OptionalFactSchema,
  eligibilityText: OptionalFactSchema,
  startDateText: OptionalFactSchema,
  endDateText: OptionalFactSchema,
  eventDateText: OptionalFactSchema,
  eventTimeText: OptionalFactSchema,
  speakerText: OptionalFactSchema,
  ctaLabel: NonEmptyStringSchema,
  ctaUrl: HttpUrlSchema,
  requiredClaims: z.array(NonEmptyStringSchema),
  requiredTerms: z.array(NonEmptyStringSchema),
  prohibitedClaims: z.array(NonEmptyStringSchema),
  additionalConfirmedFacts: z.record(NonEmptyStringSchema, NonEmptyStringSchema).optional(),
});

export const CampaignStatusSchema = z.enum([
  "draft",
  "generating",
  "generated",
  "failed",
]);

export const CampaignSchema = z.object({
  id: NonEmptyStringSchema,
  brandProfileId: NonEmptyStringSchema,
  segmentCardId: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  campaignType: CampaignTypeSchema,
  objective: CampaignObjectiveSchema,
  brief: NonEmptyStringSchema,
  facts: CampaignFactsSchema,
  selectedLayoutId: LayoutIdSchema,
  assetIds: z.array(NonEmptyStringSchema),
  status: CampaignStatusSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type CampaignFacts = z.infer<typeof CampaignFactsSchema>;
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;
export type Campaign = z.infer<typeof CampaignSchema>;

export const campaignFactsSchema = CampaignFactsSchema;
export const campaignStatusSchema = CampaignStatusSchema;
export const campaignSchema = CampaignSchema;
