import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { emailDocumentRowToDomain, segmentCardRowToDomain } from "@/db/mappers";
import { campaigns, emailDocuments, segmentCards } from "@/db/schema";
import type { Campaign, EmailBlock, EmailDocument } from "@/domain/schemas";
import { LAYOUT_SLOTS } from "@/renderer/layout-slots";

import { getBrandProfileById } from "@/app/brand-profiles/actions";
import { listAssetsByIds } from "@/app/campaigns/actions";

import {
  EditConflictError,
  EditNotFoundError,
  EditValidationError,
  finalizeAndPersist,
} from "./apply-email-document-edit";
import { buildRegenerateBlockPrompt } from "./build-prompt";
import { GenerationValidationError, generateWithRetry } from "./generate-with-retry";
import { buildRegenerateBlockOutputSchema } from "./model-output-schema";
import type { RegenerateEligibleBlockId } from "./regenerate-block-schema";
import { SYSTEM_PROMPT } from "./system-prompt";

export class RegenerateGenerationFailedError extends Error {}

function blockCurrentValue(block: EmailBlock): string {
  if (block.type === "text" || block.type === "headline") return block.content;
  if (block.type === "image") return block.altText;
  return "";
}

/**
 * Regenerates one eligible block's content via Claude, then reuses the
 * same versioning/render/validate/persist tail as a manual edit —
 * finalizeAndPersist. No other block, and none of subject/preheader/
 * CTA/footer, is touched. The Claude call happens before the write
 * transaction opens; only the successor build and persist are transactional.
 */
export async function regenerateEmailDocumentBlock(
  campaignId: string,
  baseDocumentId: string,
  expectedVersion: number,
  blockId: RegenerateEligibleBlockId,
): Promise<EmailDocument> {
  const [campaignRow] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId));
  if (!campaignRow) {
    throw new EditNotFoundError("Campaign not found.");
  }

  const generatedDocs = await db
    .select()
    .from(emailDocuments)
    .where(and(eq(emailDocuments.campaignId, campaignId), eq(emailDocuments.status, "generated")))
    .orderBy(desc(emailDocuments.version));

  const latestVersion = generatedDocs[0]?.version ?? 0;

  const baseRow = generatedDocs.find((row) => row.id === baseDocumentId);
  if (!baseRow) {
    throw new EditNotFoundError("Base document not found for this campaign.");
  }
  if (baseRow.version !== expectedVersion || baseRow.version !== latestVersion) {
    throw new EditConflictError("This document has changed since you loaded it.", latestVersion);
  }

  const baseDocument = emailDocumentRowToDomain(baseRow);
  const targetBlock = baseDocument.blocks.find((block) => block.id === blockId);
  if (!targetBlock) {
    throw new EditValidationError(`This document has no "${blockId}" block to regenerate.`);
  }
  if (targetBlock.type !== "text" && targetBlock.type !== "headline" && targetBlock.type !== "image") {
    throw new EditValidationError(`"${blockId}" is not an eligible block for regeneration.`);
  }

  const slot = LAYOUT_SLOTS[baseDocument.layoutId].find((candidate) => candidate.slotId === blockId);
  if (!slot) {
    throw new EditValidationError(`"${blockId}" is not a valid slot for this layout.`);
  }

  const brandProfile = await getBrandProfileById(campaignRow.brandProfileId);
  if (!brandProfile) {
    throw new EditNotFoundError("Brand profile not found.");
  }

  const [segmentRow] = await db
    .select()
    .from(segmentCards)
    .where(eq(segmentCards.id, campaignRow.segmentCardId));
  if (!segmentRow) {
    throw new EditNotFoundError("Segment card not found.");
  }
  const segmentCard = segmentCardRowToDomain(segmentRow);

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

  const unorderedImages = await listAssetsByIds(campaign.assetIds);
  const images = campaign.assetIds
    .map((assetId) => unorderedImages.find((asset) => asset.id === assetId))
    .filter((asset) => asset !== undefined);

  const prompt = buildRegenerateBlockPrompt({
    brandProfile,
    campaign,
    segmentCard,
    images,
    blockId,
    blockKind: slot.kind,
    currentValue: blockCurrentValue(targetBlock),
  });
  let modelOutput: { content: string } | { altText: string };
  try {
    if (slot.kind === "image") {
      modelOutput = await generateWithRetry(
        SYSTEM_PROMPT,
        prompt,
        buildRegenerateBlockOutputSchema("image"),
      );
    } else {
      modelOutput = await generateWithRetry(
        SYSTEM_PROMPT,
        prompt,
        buildRegenerateBlockOutputSchema("text"),
      );
    }
  } catch (error) {
    if (error instanceof GenerationValidationError) {
      throw new RegenerateGenerationFailedError(error.message);
    }
    throw error;
  }

  const editedBlocks: EmailBlock[] = baseDocument.blocks.map((block): EmailBlock => {
    if (block.id !== blockId) return block;
    if ("content" in modelOutput && (block.type === "text" || block.type === "headline")) {
      return { ...block, content: modelOutput.content } as EmailBlock;
    }
    if ("altText" in modelOutput && block.type === "image") {
      return { ...block, altText: modelOutput.altText } as EmailBlock;
    }
    return block;
  });

  return db.transaction(async (tx) => {
    const [lockedCampaignRow] = await tx
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .for("update");
    if (!lockedCampaignRow) {
      throw new EditNotFoundError("Campaign not found.");
    }

    const currentLatest = await tx
      .select()
      .from(emailDocuments)
      .where(and(eq(emailDocuments.campaignId, campaignId), eq(emailDocuments.status, "generated")))
      .orderBy(desc(emailDocuments.version))
      .limit(1);
    const currentLatestVersion = currentLatest[0]?.version ?? 0;
    if (currentLatestVersion !== latestVersion) {
      throw new EditConflictError(
        "A newer version of this document already exists.",
        currentLatestVersion,
      );
    }

    const successorDocument: EmailDocument = {
      ...baseDocument,
      id: crypto.randomUUID(),
      parentEmailDocumentId: baseDocument.id,
      version: latestVersion + 1,
      blocks: editedBlocks,
      validationResults: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return finalizeAndPersist({ tx, campaign, brandProfile, successorDocument });
  });
}
