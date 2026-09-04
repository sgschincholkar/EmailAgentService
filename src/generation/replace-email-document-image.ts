import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { emailDocumentRowToDomain } from "@/db/mappers";
import { assets, campaigns, emailDocuments } from "@/db/schema";
import type { Campaign, EmailBlock, EmailDocument } from "@/domain/schemas";

import { getBrandProfileById } from "@/app/brand-profiles/actions";

import {
  EditConflictError,
  EditNotFoundError,
  EditValidationError,
  finalizeAndPersist,
} from "./apply-email-document-edit";

/**
 * Replaces the asset referenced by the hero_image block with a new,
 * already-uploaded, already-validated Asset, producing a new immutable
 * EmailDocument version. Reuses finalizeAndPersist for render/validate/
 * persist — the only state this function touches beyond that is appending
 * the new asset id to Campaign.assetIds (never removing an old one), which
 * finalizeAndPersist needs to resolve the new image at render time.
 */
export async function replaceEmailDocumentImage(
  campaignId: string,
  baseDocumentId: string,
  expectedVersion: number,
  assetId: string,
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
    const heroImageBlock = baseDocument.blocks.find((block) => block.id === "hero_image");
    if (!heroImageBlock) {
      throw new EditValidationError("This document has no hero_image block to replace.");
    }
    if (heroImageBlock.type !== "image") {
      throw new EditValidationError('"hero_image" is not an image block on this document.');
    }

    const [assetRow] = await tx.select().from(assets).where(eq(assets.id, assetId));
    if (!assetRow) {
      throw new EditNotFoundError("Asset not found.");
    }
    if (assetRow.type !== "campaign_image") {
      throw new EditValidationError("Only a campaign image can be used to replace the hero image.");
    }
    if (heroImageBlock.assetId === assetId) {
      throw new EditValidationError("This is already the current image.");
    }

    const brandProfile = await getBrandProfileById(campaignRow.brandProfileId);
    if (!brandProfile) {
      throw new EditNotFoundError("Brand profile not found.");
    }

    const updatedAssetIds = campaignRow.assetIds.includes(assetId)
      ? campaignRow.assetIds
      : [...campaignRow.assetIds, assetId];

    if (updatedAssetIds !== campaignRow.assetIds) {
      await tx
        .update(campaigns)
        .set({ assetIds: updatedAssetIds, updatedAt: new Date() })
        .where(eq(campaigns.id, campaignId));
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
      assetIds: updatedAssetIds,
      status: campaignRow.status as Campaign["status"],
      createdAt: campaignRow.createdAt.toISOString(),
      updatedAt: campaignRow.updatedAt.toISOString(),
    };

    const editedBlocks: EmailBlock[] = baseDocument.blocks.map((block) =>
      block.id === "hero_image" && block.type === "image"
        ? { ...block, assetId }
        : block,
    );

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
