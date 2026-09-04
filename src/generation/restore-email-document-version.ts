import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { emailDocumentRowToDomain } from "@/db/mappers";
import { campaigns, emailDocuments } from "@/db/schema";
import type { Campaign, EmailDocument } from "@/domain/schemas";

import { getBrandProfileById } from "@/app/brand-profiles/actions";

import {
  EditConflictError,
  EditNotFoundError,
  finalizeAndPersist,
} from "./apply-email-document-edit";

/**
 * Restores a historical EmailDocument's canonical structured fields
 * (subject, preheader, blocks, layout, source facts) as a brand-new
 * version — never as a row update, never using the historical row's stale
 * renderedHtml/plainText as authoritative. Re-renders and revalidates
 * exactly like an edit. No Claude call.
 */
export async function restoreEmailDocumentVersion(
  campaignId: string,
  sourceDocumentId: string,
  expectedVersion: number,
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

    const sourceRow = generatedDocs.find((row) => row.id === sourceDocumentId);
    if (!sourceRow) {
      throw new EditNotFoundError("Source document not found for this campaign.");
    }

    if (latestVersion !== expectedVersion) {
      throw new EditConflictError(
        "A newer version already exists. Reload before restoring.",
        latestVersion,
      );
    }

    const sourceDocument = emailDocumentRowToDomain(sourceRow);

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

    const successorDocument: EmailDocument = {
      ...sourceDocument,
      id: crypto.randomUUID(),
      parentEmailDocumentId: sourceDocument.id,
      version: latestVersion + 1,
      validationResults: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return finalizeAndPersist({ tx, campaign, brandProfile, successorDocument });
  });
}
