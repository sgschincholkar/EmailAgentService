import { z } from "zod";

import {
  EmailKindSchema,
  EmailStatusSchema,
  LayoutIdSchema,
  NonEmptyStringSchema,
  TimestampSchema,
  ValidationCodeSchema,
  ValidationSeveritySchema,
} from "./common";

const EditableBlockFieldsSchema = z.object({
  id: NonEmptyStringSchema,
  editable: z.boolean(),
  lockedForVariants: z.boolean(),
});

export const TextEmailBlockSchema = EditableBlockFieldsSchema.extend({
  type: z.enum(["headline", "subheadline", "text", "benefits", "legal_text"]),
  content: NonEmptyStringSchema,
});

export const ImageEmailBlockSchema = EditableBlockFieldsSchema.extend({
  type: z.literal("image"),
  assetId: NonEmptyStringSchema,
  altText: NonEmptyStringSchema,
});

export const ButtonEmailBlockSchema = EditableBlockFieldsSchema.extend({
  type: z.literal("button"),
  label: NonEmptyStringSchema,
  href: NonEmptyStringSchema,
});

export const FooterEmailBlockSchema = z.object({
  id: NonEmptyStringSchema,
  type: z.literal("footer"),
  html: NonEmptyStringSchema,
  editable: z.literal(false),
  lockedForVariants: z.literal(true),
});

export const EmailBlockSchema = z.discriminatedUnion("type", [
  TextEmailBlockSchema,
  ImageEmailBlockSchema,
  ButtonEmailBlockSchema,
  FooterEmailBlockSchema,
]);

export const SourceFactSchema = z.object({
  id: NonEmptyStringSchema,
  category: NonEmptyStringSchema,
  value: NonEmptyStringSchema,
  sourceType: z.enum(["campaign_fact", "brief", "brand_profile", "manual"]),
  sourceReference: NonEmptyStringSchema.optional(),
  approvedForUse: z.boolean(),
});

export const ValidationResultSchema = z.object({
  id: NonEmptyStringSchema,
  severity: ValidationSeveritySchema,
  code: ValidationCodeSchema,
  message: NonEmptyStringSchema,
  blockId: NonEmptyStringSchema.optional(),
  suggestedAction: NonEmptyStringSchema.optional(),
  createdAt: TimestampSchema,
});

export const EmailDocumentSchema = z.object({
  id: NonEmptyStringSchema,
  campaignId: NonEmptyStringSchema,
  kind: EmailKindSchema,
  parentEmailDocumentId: NonEmptyStringSchema.optional(),
  version: z.number().int().positive(),
  layoutId: LayoutIdSchema,
  subject: NonEmptyStringSchema,
  preheader: NonEmptyStringSchema,
  blocks: z.array(EmailBlockSchema).min(1),
  sourceFacts: z.array(SourceFactSchema),
  validationResults: z.array(ValidationResultSchema),
  renderedHtml: NonEmptyStringSchema.optional(),
  plainText: NonEmptyStringSchema.optional(),
  pdfAssetId: NonEmptyStringSchema.optional(),
  status: EmailStatusSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type TextEmailBlock = z.infer<typeof TextEmailBlockSchema>;
export type ImageEmailBlock = z.infer<typeof ImageEmailBlockSchema>;
export type ButtonEmailBlock = z.infer<typeof ButtonEmailBlockSchema>;
export type FooterEmailBlock = z.infer<typeof FooterEmailBlockSchema>;
export type EmailBlock = z.infer<typeof EmailBlockSchema>;
export type SourceFact = z.infer<typeof SourceFactSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type EmailDocument = z.infer<typeof EmailDocumentSchema>;

export const textEmailBlockSchema = TextEmailBlockSchema;
export const imageEmailBlockSchema = ImageEmailBlockSchema;
export const buttonEmailBlockSchema = ButtonEmailBlockSchema;
export const footerEmailBlockSchema = FooterEmailBlockSchema;
export const emailBlockSchema = EmailBlockSchema;
export const sourceFactSchema = SourceFactSchema;
export const validationResultSchema = ValidationResultSchema;
export const emailDocumentSchema = EmailDocumentSchema;
