import { z } from "zod";

import {
  DEFAULT_BRAND_PROFILE_CTA_STYLE,
  DEFAULT_FOOTER_HTML,
  DEFAULT_EMAIL_FONT_STACK,
} from "../brand-profile-defaults";
import { NonEmptyStringSchema, TimestampSchema } from "./common";

const HexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, {
  message: "Color must be a six-digit hex value, such as #285E61.",
});

export const BrandProfileColorsSchema = z.object({
  primary: HexColorSchema,
  secondary: HexColorSchema.optional(),
  accent: HexColorSchema.optional(),
  background: HexColorSchema.optional(),
  text: HexColorSchema.optional(),
});

export const BrandProfileSchema = z.object({
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  logoAssetId: NonEmptyStringSchema.optional(),
  colors: BrandProfileColorsSchema,
  preferredFont: NonEmptyStringSchema.optional(),
  emailFontStack: NonEmptyStringSchema.default(DEFAULT_EMAIL_FONT_STACK),
  tone: z.array(NonEmptyStringSchema).min(1),
  voiceNotes: NonEmptyStringSchema.optional(),
  preferredTerms: z.array(NonEmptyStringSchema).default([]),
  prohibitedTerms: z.array(NonEmptyStringSchema).default([]),
  defaultCtaStyle: z
    .enum(["filled", "outline"])
    .default(DEFAULT_BRAND_PROFILE_CTA_STYLE),
  defaultFooterHtml: NonEmptyStringSchema.default(DEFAULT_FOOTER_HTML),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type BrandProfileColors = z.infer<typeof BrandProfileColorsSchema>;
export type BrandProfile = z.infer<typeof BrandProfileSchema>;

export const brandProfileSchema = BrandProfileSchema;
