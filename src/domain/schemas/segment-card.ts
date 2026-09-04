import { z } from "zod";

import {
  LifecycleStageSchema,
  NonEmptyStringSchema,
  TimestampSchema,
} from "./common";

export const SegmentCardSchema = z.object({
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  lifecycleStage: LifecycleStageSchema.optional(),
  primaryMotivation: NonEmptyStringSchema,
  primaryObjection: NonEmptyStringSchema,
  desiredAction: NonEmptyStringSchema,
  messagingNotes: NonEmptyStringSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type SegmentCard = z.infer<typeof SegmentCardSchema>;

export const segmentCardSchema = SegmentCardSchema;
