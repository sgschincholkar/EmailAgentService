import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { emailDocumentRowToDomain } from "@/db/mappers";
import { campaigns, emailDocuments } from "@/db/schema";
import type {
  BrandProfile,
  ButtonEmailBlock,
  Campaign,
  EmailBlock,
  EmailDocument,
  ImageEmailBlock,
  TextEmailBlock,
} from "@/domain/schemas";
import { HttpUrlSchema } from "@/domain/schemas";
import { buildAssetUrlResolver } from "@/renderer/resolve-asset-url";
import { renderEmail } from "@/renderer/render-email";

import { getBrandProfileById } from "@/app/brand-profiles/actions";
import { listAssetsByIds } from "@/app/campaigns/actions";

import type { EmailDocumentEditCommand } from "./email-document-edit-schema";
import { runValidations } from "./run-validations";

export class EditConflictError extends Error {
  latestVersion: number;
  constructor(message: string, latestVersion: number) {
    super(message);
    this.latestVersion = latestVersion;
  }
}

export class EditValidationError extends Error {}
export class EditNotFoundError extends Error {}
export class EditFailedError extends Error {}

const EDITABLE_BLOCK_IDS = new Set([
  "headline",
  "body",
  "event_details",
  "offer_details",
  "cta",
  "hero_image",
]);

/**
 * Applies a narrow, server-validated edit command to the campaign's current
 * latest EmailDocument version, producing a new immutable version. Runs
 * entirely inside one transaction with a row lock on the campaign — no
 * existing version is ever updated in place, and a failure at any step
 * leaves no partial row.
 */
export async function applyEmailDocumentEdit(
  campaignId: string,
  command: EmailDocumentEditCommand,
): Promise<EmailDocument> {
  return db.transaction(async (tx) => {
    const [campaignRow] = await tx
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .for("update");

    if (!campaignRow) {
      throw new EditNotFoundError("Campaign not found.");
    }

    const generatedDocs = await tx
      .select()
      .from(emailDocuments)
      .where(
        and(eq(emailDocuments.campaignId, campaignId), eq(emailDocuments.status, "generated")),
      )
      .orderBy(desc(emailDocuments.version));

    const latestVersion = generatedDocs[0]?.version ?? 0;

    const baseRow = generatedDocs.find((row) => row.id === command.baseDocumentId);
    if (!baseRow) {
      throw new EditNotFoundError("Base document not found for this campaign.");
    }

    if (baseRow.version !== command.expectedVersion) {
      throw new EditConflictError(
        "This document has changed since you loaded it.",
        latestVersion,
      );
    }
    if (baseRow.version !== latestVersion) {
      throw new EditConflictError(
        "A newer version of this document already exists.",
        latestVersion,
      );
    }

    const baseDocument = emailDocumentRowToDomain(baseRow);

    const brandProfile = await getBrandProfileById(campaignRow.brandProfileId);
    if (!brandProfile) {
      throw new EditNotFoundError("Brand profile not found.");
    }

    const campaign: Campaign = {
      id: campaignRow.id,
      brandProfileId: campaignRow.brandProfileId,
      segmentCardId: campaignRow.segmentCardId,
      name: campaignRow.name,
      campaignType: campaignRow.campaignType as Campaign["campaignType"],
      objective: campaignRow.objective as Campaign["objective"],
      brief: campaignRow.brief,
      facts: campaignRow.facts as Campaign["facts"],
      selectedLayoutId: campaignRow.selectedLayoutId as Campaign["selectedLayoutId"],
      assetIds: campaignRow.assetIds,
      status: campaignRow.status as Campaign["status"],
      createdAt: campaignRow.createdAt.toISOString(),
      updatedAt: campaignRow.updatedAt.toISOString(),
    };

    const editedBlocks = applyEditsToBlocks(baseDocument.blocks, command);
    let subject = baseDocument.subject;
    let preheader = baseDocument.preheader;
    for (const edit of command.edits) {
      if (edit.target === "document" && edit.field === "subject") subject = edit.value;
      if (edit.target === "document" && edit.field === "preheader") preheader = edit.value;
    }

    const successorDocument: EmailDocument = {
      ...baseDocument,
      id: crypto.randomUUID(),
      parentEmailDocumentId: baseDocument.id,
      version: latestVersion + 1,
      subject,
      preheader,
      blocks: editedBlocks,
      validationResults: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return finalizeAndPersist({ tx, campaign, brandProfile, successorDocument });
  });
}

function applyEditsToBlocks(
  blocks: EmailBlock[],
  command: EmailDocumentEditCommand,
): EmailBlock[] {
  const blockEdits = command.edits.filter((edit) => edit.target === "block");

  for (const edit of blockEdits) {
    if (!EDITABLE_BLOCK_IDS.has(edit.blockId)) {
      throw new EditValidationError(`"${edit.blockId}" is not an editable block.`);
    }
    const block = blocks.find((candidate) => candidate.id === edit.blockId);
    if (!block) {
      throw new EditValidationError(
        `This document has no "${edit.blockId}" block to edit.`,
      );
    }
    if (block.type === "footer") {
      throw new EditValidationError("The footer can't be edited.");
    }
  }

  return blocks.map((block) => {
    if (block.type === "footer") return block;

    const relevantEdits = blockEdits.filter((edit) => edit.blockId === block.id);
    if (relevantEdits.length === 0) return block;

    if (block.type === "text" || block.type === "headline") {
      return applyTextBlockEdits(block as TextEmailBlock, relevantEdits);
    }
    if (block.type === "image") {
      return applyImageBlockEdits(block as ImageEmailBlock, relevantEdits);
    }
    if (block.type === "button") {
      return applyButtonBlockEdits(block as ButtonEmailBlock, relevantEdits);
    }
    return block;
  });
}

type BlockEdit = Extract<EmailDocumentEditCommand["edits"][number], { target: "block" }>;

function applyTextBlockEdits(block: TextEmailBlock, edits: BlockEdit[]): TextEmailBlock {
  let content = block.content;
  for (const edit of edits) {
    if (edit.field !== "content") {
      throw new EditValidationError(`Block "${block.id}" does not accept field "${edit.field}".`);
    }
    content = edit.value;
  }
  return { ...block, content };
}

function applyImageBlockEdits(block: ImageEmailBlock, edits: BlockEdit[]): ImageEmailBlock {
  let altText = block.altText;
  for (const edit of edits) {
    if (edit.field !== "altText") {
      throw new EditValidationError(`Block "${block.id}" does not accept field "${edit.field}".`);
    }
    altText = edit.value;
  }
  return { ...block, altText };
}

function applyButtonBlockEdits(block: ButtonEmailBlock, edits: BlockEdit[]): ButtonEmailBlock {
  let label = block.label;
  let href = block.href;
  for (const edit of edits) {
    if (edit.field === "label") {
      label = edit.value;
    } else if (edit.field === "href") {
      const result = HttpUrlSchema.safeParse(edit.value);
      if (!result.success) {
        throw new EditValidationError("The CTA URL must be a valid http or https address.");
      }
      href = result.data;
    } else {
      throw new EditValidationError(`Block "${block.id}" does not accept field "${edit.field}".`);
    }
  }
  return { ...block, label, href };
}

/**
 * Shared render/validate/persist tail used by both edit and restore — runs
 * inside the caller's transaction. Throws (aborting the transaction) on any
 * blocking condition; never inserts a partial row.
 */
export async function finalizeAndPersist(params: {
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0];
  campaign: Campaign;
  brandProfile: BrandProfile;
  successorDocument: EmailDocument;
}): Promise<EmailDocument> {
  const { tx, campaign, brandProfile, successorDocument } = params;

  const unorderedImages = await listAssetsByIds(campaign.assetIds);
  const images = campaign.assetIds
    .map((assetId) => unorderedImages.find((asset) => asset.id === assetId))
    .filter((asset) => asset !== undefined);

  const validationResults = runValidations({
    campaign,
    brandProfile,
    document: successorDocument,
    hasImage: images.length > 0,
  });

  const blockingErrors = validationResults.filter((result) => result.severity === "error");
  if (blockingErrors.length > 0) {
    throw new EditValidationError(blockingErrors[0].message);
  }

  const documentWithValidation: EmailDocument = {
    ...successorDocument,
    validationResults,
  };

  let html: string;
  let plainText: string;
  try {
    const resolveAssetUrl = await buildAssetUrlResolver(campaign.assetIds);
    const rendered = renderEmail(documentWithValidation, brandProfile, { resolveAssetUrl });
    html = rendered.html;
    plainText = rendered.plainText;
  } catch (error) {
    if (process.env.GENERATION_DEBUG) {
      console.error("applyEmailDocumentEdit render error:", error);
    }
    throw new EditFailedError("This edit couldn't be rendered. No new version was saved.");
  }

  if (!html || !plainText) {
    throw new EditFailedError("Rendering produced empty content. No new version was saved.");
  }

  const finalDocument: EmailDocument = {
    ...documentWithValidation,
    renderedHtml: html,
    plainText,
    status: "generated",
  };

  await tx.insert(emailDocuments).values({
    id: finalDocument.id,
    campaignId: finalDocument.campaignId,
    parentEmailDocumentId: finalDocument.parentEmailDocumentId,
    kind: finalDocument.kind,
    version: finalDocument.version,
    layoutId: finalDocument.layoutId,
    subject: finalDocument.subject,
    preheader: finalDocument.preheader,
    blocks: finalDocument.blocks,
    sourceFacts: finalDocument.sourceFacts,
    validationResults: finalDocument.validationResults,
    renderedHtml: finalDocument.renderedHtml,
    plainText: finalDocument.plainText,
    status: finalDocument.status,
  });

  return finalDocument;
}
