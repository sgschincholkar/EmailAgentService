import { z } from "zod";

import type { LayoutId } from "@/domain/schemas";
import { LAYOUT_SLOTS } from "@/renderer/layout-slots";

import { containsHtmlLikeMarkup } from "./html-like-detector";

const NoHtmlStringSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !containsHtmlLikeMarkup(value), {
    message: "Content must not contain HTML-like markup.",
  });

/**
 * Model-facing block shape. Claude supplies content for text/image slots
 * only — no CTA label/URL (system-built from CampaignFacts), no footer
 * (system-built from BrandProfile), no image asset IDs or URLs (the asset
 * already exists from Slice 3; the model only supplies descriptive alt
 * text for it).
 */
const ModelTextBlockSchema = z
  .object({
    slotId: z.string(),
    type: z.literal("text"),
    content: NoHtmlStringSchema,
  })
  .strict();

const ModelImageAltTextBlockSchema = z
  .object({
    slotId: z.string(),
    type: z.literal("image"),
    altText: NoHtmlStringSchema,
  })
  .strict();

const ModelBlockSchema = z.discriminatedUnion("type", [
  ModelTextBlockSchema,
  ModelImageAltTextBlockSchema,
]);

const BaseModelOutputSchema = z.object({
  campaignAngle: NoHtmlStringSchema,
  subjectLineOptions: z.tuple([
    NoHtmlStringSchema,
    NoHtmlStringSchema,
    NoHtmlStringSchema,
  ]),
  selectedSubjectLine: NoHtmlStringSchema,
  preheader: NoHtmlStringSchema,
  blocks: z.array(ModelBlockSchema),
  assumptions: z.array(z.string()),
  missingInputs: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type ModelOutput = z.infer<typeof BaseModelOutputSchema>;

/**
 * Builds the Zod schema for one layout's model output. The `blocks` array
 * must cover every required non-CTA text/image slot for the layout and
 * must not contain any slotId outside that layout's declared set (no
 * unknown/invented blocks, no CTA block from the model).
 */
export function buildModelOutputSchema(layoutId: LayoutId) {
  const slots = LAYOUT_SLOTS[layoutId];
  const modelSlots = slots.filter((slot) => slot.kind !== "button");
  const allowedSlotIds = new Set(modelSlots.map((slot) => slot.slotId));
  const requiredSlotIds = new Set(
    modelSlots.filter((slot) => slot.required).map((slot) => slot.slotId),
  );

  return BaseModelOutputSchema.superRefine((output, ctx) => {
    if (!output.subjectLineOptions.includes(output.selectedSubjectLine)) {
      ctx.addIssue({
        code: "custom",
        path: ["selectedSubjectLine"],
        message: "selectedSubjectLine must be one of subjectLineOptions.",
      });
    }

    const seenSlotIds = new Set<string>();
    for (const [index, block] of output.blocks.entries()) {
      if (!allowedSlotIds.has(block.slotId)) {
        ctx.addIssue({
          code: "custom",
          path: ["blocks", index, "slotId"],
          message: `"${block.slotId}" is not a valid slot for this layout.`,
        });
        continue;
      }

      const expectedKind = modelSlots.find((slot) => slot.slotId === block.slotId)?.kind;
      if (expectedKind && expectedKind !== block.type) {
        ctx.addIssue({
          code: "custom",
          path: ["blocks", index, "type"],
          message: `Slot "${block.slotId}" must be type "${expectedKind}".`,
        });
      }

      seenSlotIds.add(block.slotId);
    }

    for (const requiredSlotId of requiredSlotIds) {
      if (!seenSlotIds.has(requiredSlotId)) {
        ctx.addIssue({
          code: "custom",
          path: ["blocks"],
          message: `Missing required slot "${requiredSlotId}" for this layout.`,
        });
      }
    }
  });
}

const RegenerateTextBlockOutputSchema = z.object({ content: NoHtmlStringSchema }).strict();
const RegenerateImageAltTextOutputSchema = z.object({ altText: NoHtmlStringSchema }).strict();

export type RegenerateTextBlockOutput = z.infer<typeof RegenerateTextBlockOutputSchema>;
export type RegenerateImageAltTextOutput = z.infer<typeof RegenerateImageAltTextOutputSchema>;

/**
 * Narrow output schema for a targeted single-block regeneration — either
 * {content} for a text slot or {altText} for the image slot. Deliberately
 * excludes every other ModelOutput field (no subject options, no CTA, no
 * other blocks) so Claude cannot smuggle a wider rewrite through this path.
 */
export function buildRegenerateBlockOutputSchema(
  blockKind: "image",
): typeof RegenerateImageAltTextOutputSchema;
export function buildRegenerateBlockOutputSchema(
  blockKind: "text",
): typeof RegenerateTextBlockOutputSchema;
export function buildRegenerateBlockOutputSchema(blockKind: "text" | "image") {
  return blockKind === "image"
    ? RegenerateImageAltTextOutputSchema
    : RegenerateTextBlockOutputSchema;
}
