import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { emailDocumentRowToDomain } from "@/db/mappers";
import { campaigns, emailDocuments } from "@/db/schema";
import type { Campaign, EmailDocument, LayoutId } from "@/domain/schemas";

import { getBrandProfileById } from "@/app/brand-profiles/actions";

import {
  EditConflictError,
  EditNotFoundError,
  EditValidationError,
  finalizeAndPersist,
} from "./apply-email-document-edit";
import { mapBlocksToLayout } from "./layout-block-mapper";

/**
 * Switches an EmailDocument's layout via pure block-id mapping — no Claude
 * call, no invented content. Reuses the same versioning/render/validate/
 * persist tail as edit/regenerate/replace-image (finalizeAndPersist).
 *
 * Every "required" slot in LAYOUT_SLOTS is also a hard renderer
 * requirement (see requireTextBlock/requireImageBlock in the templates) —
 * a missing required slot doesn't just fail validation, it throws inside
 * renderEmail. Rather than let that surface as a generic render-failure
 * 500, this function checks mapBlocksToLayout's missingRequired list
 * up front and rejects with a specific EditValidationError (400) before
 * ever calling finalizeAndPersist — no renderer change, no successor row,
 * and no invented content to paper over the gap.
 */
export async function switchEmailDocumentLayout(
  campaignId: string,
  baseDocumentId: string,
  expectedVersion: number,
  targetLayoutId: LayoutId,
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
    if (baseDocument.layoutId === targetLayoutId) {
      throw new EditValidationError("This document is already using that layout.");
    }

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
      selectedLayoutId: targetLayoutId,
      assetIds: campaignRow.assetIds,
      status: campaignRow.status as Campaign["status"],
      createdAt: campaignRow.createdAt.toISOString(),
      updatedAt: campaignRow.updatedAt.toISOString(),
    };

    const { blocks, missingRequired } = mapBlocksToLayout(baseDocument.blocks, targetLayoutId);
    if (missingRequired.length > 0) {
      throw new EditValidationError(
        `This layout needs "${missingRequired.join('", "')}", which isn't set on this draft. ` +
          "Add that content on a layout that has this field, then switch again.",
      );
    }

    const successorDocument: EmailDocument = {
      ...baseDocument,
      id: crypto.randomUUID(),
      parentEmailDocumentId: baseDocument.id,
      version: latestVersion + 1,
      layoutId: targetLayoutId,
      blocks,
      validationResults: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return finalizeAndPersist({ tx, campaign, brandProfile, successorDocument });
  });
}
