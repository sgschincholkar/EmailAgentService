import { z } from "zod";

import {
  AssetTypeSchema,
  HttpUrlSchema,
  NonEmptyStringSchema,
  TimestampSchema,
} from "./common";

export const AssetSchema = z.object({
  id: NonEmptyStringSchema,
  type: AssetTypeSchema,
  filename: NonEmptyStringSchema,
  mimeType: NonEmptyStringSchema,
  sizeBytes: z.number().int().nonnegative(),
  storageKey: NonEmptyStringSchema,
  publicUrl: HttpUrlSchema.optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  altText: NonEmptyStringSchema.optional(),
  createdAt: TimestampSchema,
});

export type Asset = z.infer<typeof AssetSchema>;

export const assetSchema = AssetSchema;
