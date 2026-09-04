"use server";

import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import {
  assetRowToDomain,
  campaignRowToDomain,
  emailDocumentRowToDomain,
  segmentCardRowToDomain,
} from "@/db/mappers";
import { assets, campaigns, emailDocuments, segmentCards } from "@/db/schema";
import { CampaignFormInputSchema } from "@/domain/campaign-form-schema";
import type { CampaignFormInput } from "@/domain/campaign-form-schema";
import type {
  Asset,
  Campaign,
  CampaignFacts,
  EmailDocument,
  LayoutId,
  SegmentCard,
} from "@/domain/schemas";

export type { CampaignFormInput } from "@/domain/campaign-form-schema";

export type CampaignWithSegment = Campaign & { segmentCard: SegmentCard };

export async function listCampaigns(): Promise<Campaign[]> {
  const rows = await db.select().from(campaigns);
  return rows.map(campaignRowToDomain);
}

export async function listAssetsByIds(assetIds: string[]): Promise<Asset[]> {
  if (assetIds.length === 0) return [];
  const rows = await db.select().from(assets).where(inArray(assets.id, assetIds));
  return rows.map(assetRowToDomain);
}

/**
 * Loads the latest successfully generated EmailDocument for a campaign, if
 * one exists. Read-only — no writes, no rendering, no generation call.
 * Prefers the highest version among status="generated" documents.
 */
export async function getLatestGeneratedEmailDocument(
  campaignId: string,
): Promise<EmailDocument | undefined> {
  const [row] = await db
    .select()
    .from(emailDocuments)
    .where(
      and(eq(emailDocuments.campaignId, campaignId), eq(emailDocuments.status, "generated")),
    )
    .orderBy(desc(emailDocuments.version), desc(emailDocuments.createdAt))
    .limit(1);

  return row ? emailDocumentRowToDomain(row) : undefined;
}

/**
 * Loads one specific generated version, scoped strictly to the given
 * campaign — a version number for a different campaign can never resolve
 * here, so cross-campaign document access by guessing an ID/version is
 * structurally impossible. Read-only.
 */
export async function getEmailDocumentByCampaignAndVersion(
  campaignId: string,
  version: number,
): Promise<EmailDocument | undefined> {
  const [row] = await db
    .select()
    .from(emailDocuments)
    .where(
      and(
        eq(emailDocuments.campaignId, campaignId),
        eq(emailDocuments.version, version),
        eq(emailDocuments.status, "generated"),
      ),
    )
    .limit(1);

  return row ? emailDocumentRowToDomain(row) : undefined;
}

export type EmailDocumentVersionSummary = {
  id: string;
  version: number;
  createdAt: string;
};

/**
 * Lists every generated version for a campaign, newest first. Used for the
 * version-history panel — read-only, no rendering, no writes.
 */
export async function listEmailDocumentVersions(
  campaignId: string,
): Promise<EmailDocumentVersionSummary[]> {
  const rows = await db
    .select({
      id: emailDocuments.id,
      version: emailDocuments.version,
      createdAt: emailDocuments.createdAt,
    })
    .from(emailDocuments)
    .where(
      and(eq(emailDocuments.campaignId, campaignId), eq(emailDocuments.status, "generated")),
    )
    .orderBy(desc(emailDocuments.version), desc(emailDocuments.createdAt));

  return rows.map((row) => ({
    id: row.id,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getCampaignById(
  id: string,
): Promise<CampaignWithSegment | undefined> {
  const [campaignRow] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, id));
  if (!campaignRow) return undefined;

  const [segmentRow] = await db
    .select()
    .from(segmentCards)
    .where(eq(segmentCards.id, campaignRow.segmentCardId));
  if (!segmentRow) return undefined;

  return {
    ...campaignRowToDomain(campaignRow),
    segmentCard: segmentCardRowToDomain(segmentRow),
  };
}

/**
 * Creates or updates a Campaign and its inline Segment Card atomically. An
 * invalid Campaign must never leave an orphan Segment Card row, so both
 * writes happen inside one transaction.
 */
export async function saveCampaign(
  rawInput: CampaignFormInput,
): Promise<CampaignWithSegment> {
  const input = CampaignFormInputSchema.parse(rawInput);
  const now = new Date();

  return db.transaction(async (tx) => {
    let segmentCardId: string;

    if (input.id) {
      const [existing] = await tx
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, input.id));
      if (!existing) throw new Error("Campaign not found.");
      segmentCardId = existing.segmentCardId;

      await tx
        .update(segmentCards)
        .set({
          name: input.segmentCard.name,
          lifecycleStage: input.segmentCard.lifecycleStage ?? null,
          primaryMotivation: input.segmentCard.primaryMotivation,
          primaryObjection: input.segmentCard.primaryObjection,
          desiredAction: input.segmentCard.desiredAction,
          messagingNotes: input.segmentCard.messagingNotes ?? null,
          updatedAt: now,
        })
        .where(eq(segmentCards.id, segmentCardId));
    } else {
      const [segmentRow] = await tx
        .insert(segmentCards)
        .values({
          name: input.segmentCard.name,
          lifecycleStage: input.segmentCard.lifecycleStage ?? null,
          primaryMotivation: input.segmentCard.primaryMotivation,
          primaryObjection: input.segmentCard.primaryObjection,
          desiredAction: input.segmentCard.desiredAction,
          messagingNotes: input.segmentCard.messagingNotes ?? null,
        })
        .returning();
      segmentCardId = segmentRow.id;
    }

    const campaignValues = {
      brandProfileId: input.brandProfileId,
      segmentCardId,
      name: input.name,
      campaignType: input.campaignType,
      objective: input.objective,
      brief: input.brief,
      facts: input.facts satisfies CampaignFacts,
      selectedLayoutId: input.selectedLayoutId satisfies LayoutId,
      assetIds: input.images.map((image) => image.assetId),
      updatedAt: now,
    };

    for (const image of input.images) {
      if (image.altText) {
        await tx
          .update(assets)
          .set({ altText: image.altText })
          .where(eq(assets.id, image.assetId));
      }
    }

    const [campaignRow] = input.id
      ? await tx
          .update(campaigns)
          .set(campaignValues)
          .where(eq(campaigns.id, input.id))
          .returning()
      : await tx
          .insert(campaigns)
          .values({ ...campaignValues, status: "draft" })
          .returning();

    const [segmentRow] = await tx
      .select()
      .from(segmentCards)
      .where(eq(segmentCards.id, segmentCardId));

    return {
      ...campaignRowToDomain(campaignRow),
      segmentCard: segmentCardRowToDomain(segmentRow),
    };
  });
}
