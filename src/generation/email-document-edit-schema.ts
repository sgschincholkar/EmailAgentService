import { z } from "zod";

import { containsHtmlLikeMarkup } from "./html-like-detector";

/**
 * Input-protection limits only — not marketing character-count guidance,
 * not auto-truncated. Conservative maximums approved for Slice 6A.
 */
export const EDIT_FIELD_MAX_LENGTHS = {
  subject: 200,
  preheader: 200,
  content: 2000,
  label: 100,
  href: 2048,
  altText: 300,
} as const;

const DocumentEditSchema = z.object({
  target: z.literal("document"),
  field: z.enum(["subject", "preheader"]),
  value: z.string(),
});

const BlockEditSchema = z.object({
  target: z.literal("block"),
  blockId: z.enum([
    "headline",
    "body",
    "event_details",
    "offer_details",
    "cta",
    "hero_image",
  ]),
  field: z.enum(["content", "label", "href", "altText"]),
  value: z.string(),
});

const RawEditSchema = z.discriminatedUnion("target", [DocumentEditSchema, BlockEditSchema]);

export const EmailDocumentEditCommandSchema = z
  .object({
    baseDocumentId: z.string().min(1),
    expectedVersion: z.number().int().positive(),
    edits: z.array(RawEditSchema).min(1),
  })
  .superRefine((command, ctx) => {
    const seenTargets = new Set<string>();

    for (const [index, edit] of command.edits.entries()) {
      const targetKey =
        edit.target === "document" ? `document:${edit.field}` : `block:${edit.blockId}:${edit.field}`;

      if (seenTargets.has(targetKey)) {
        ctx.addIssue({
          code: "custom",
          path: ["edits", index],
          message: `Duplicate edit for "${targetKey}" in one command is not allowed.`,
        });
        continue;
      }
      seenTargets.add(targetKey);

      if (edit.target === "document") {
        validateDocumentField(edit, index, ctx);
      } else {
        validateBlockField(edit, index, ctx);
      }
    }
  });

function validateDocumentField(
  edit: z.infer<typeof DocumentEditSchema>,
  index: number,
  ctx: z.RefinementCtx,
) {
  const maxLength = EDIT_FIELD_MAX_LENGTHS[edit.field];
  requireNonEmpty(edit.value, index, ctx);
  requireMaxLength(edit.value, maxLength, index, ctx);
  requireNoHtmlLike(edit.value, index, ctx);
}

const BLOCK_ALLOWED_FIELDS: Record<
  z.infer<typeof BlockEditSchema>["blockId"],
  readonly (typeof BlockEditSchema)["shape"]["field"]["options"][number][]
> = {
  headline: ["content"],
  body: ["content"],
  event_details: ["content"],
  offer_details: ["content"],
  cta: ["label", "href"],
  hero_image: ["altText"],
};

function validateBlockField(
  edit: z.infer<typeof BlockEditSchema>,
  index: number,
  ctx: z.RefinementCtx,
) {
  const allowedFields = BLOCK_ALLOWED_FIELDS[edit.blockId];
  if (!allowedFields.includes(edit.field)) {
    ctx.addIssue({
      code: "custom",
      path: ["edits", index, "field"],
      message: `Block "${edit.blockId}" does not accept field "${edit.field}".`,
    });
    return;
  }

  requireNonEmpty(edit.value, index, ctx);

  if (edit.field === "href") {
    // URL length/safety validated separately against the existing
    // HttpUrlSchema in the edit pipeline — not duplicated here.
    requireMaxLength(edit.value, EDIT_FIELD_MAX_LENGTHS.href, index, ctx);
    return;
  }

  const maxLength = EDIT_FIELD_MAX_LENGTHS[edit.field as "content" | "label" | "altText"];
  requireMaxLength(edit.value, maxLength, index, ctx);
  requireNoHtmlLike(edit.value, index, ctx);
}

function requireNonEmpty(value: string, index: number, ctx: z.RefinementCtx) {
  if (value.trim().length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["edits", index, "value"],
      message: "This field can't be empty.",
    });
  }
}

function requireMaxLength(
  value: string,
  maxLength: number,
  index: number,
  ctx: z.RefinementCtx,
) {
  if (value.length > maxLength) {
    ctx.addIssue({
      code: "custom",
      path: ["edits", index, "value"],
      message: `This field must be ${maxLength} characters or fewer.`,
    });
  }
}

function requireNoHtmlLike(value: string, index: number, ctx: z.RefinementCtx) {
  if (containsHtmlLikeMarkup(value)) {
    ctx.addIssue({
      code: "custom",
      path: ["edits", index, "value"],
      message: "Content must not contain HTML-like markup.",
    });
  }
}

export type EmailDocumentEditCommand = z.infer<typeof EmailDocumentEditCommandSchema>;
export type DocumentFieldEdit = z.infer<typeof DocumentEditSchema>;
export type BlockFieldEdit = z.infer<typeof BlockEditSchema>;
