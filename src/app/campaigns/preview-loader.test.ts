import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { saveBrandProfile } from "@/app/brand-profiles/actions";
import { db } from "@/db/client";
import { brandProfiles, campaigns, emailDocuments, segmentCards } from "@/db/schema";
import { CampaignFactsSchema, LayoutIdSchema } from "@/domain/schemas";

import { getLatestGeneratedEmailDocument, saveCampaign, type CampaignFormInput } from "./actions";

/**
 * Exercises getLatestGeneratedEmailDocument against real Postgres. Scoped
 * cleanup only — deletes exactly the rows this file created.
 */
describe("getLatestGeneratedEmailDocument", () => {
  let brandProfileId: string;
  let campaignId: string;
  const createdCampaignIds: string[] = [];
  const createdSegmentCardIds: string[] = [];
  const createdEmailDocumentIds: string[] = [];

  beforeAll(async () => {
    const profile = await saveBrandProfile({
      name: "Preview Loader Test Brand",
      colors: { primary: "#2563EB" },
      emailFontStack: "Arial, Helvetica, sans-serif",
      tone: ["Warm"],
      preferredTerms: [],
      prohibitedTerms: [],
      defaultCtaStyle: "filled",
      defaultFooterHtml: "Preview loader test footer",
    });
    brandProfileId = profile.id;

    const input: CampaignFormInput = {
      brandProfileId,
      name: "Preview Loader Test Campaign",
      campaignType: "announcement",
      objective: "awareness",
      brief: "Testing the preview loader.",
      facts: CampaignFactsSchema.parse({
        ctaLabel: "Try it now",
        ctaUrl: "https://app.example.com/try",
        requiredClaims: [],
        requiredTerms: [],
        prohibitedClaims: [],
      }),
      selectedLayoutId: LayoutIdSchema.parse("text_announcement"),
      images: [],
      segmentCard: {
        name: "Test segment",
        primaryMotivation: "Curiosity",
        primaryObjection: "No time",
        desiredAction: "Click through",
      },
    };
    const campaign = await saveCampaign(input);
    campaignId = campaign.id;
    createdCampaignIds.push(campaign.id);
    createdSegmentCardIds.push(campaign.segmentCard.id);
  });

  afterAll(async () => {
    if (createdEmailDocumentIds.length > 0) {
      await db
        .delete(emailDocuments)
        .where(inArray(emailDocuments.id, createdEmailDocumentIds));
    }
    if (createdCampaignIds.length > 0) {
      await db.delete(campaigns).where(inArray(campaigns.id, createdCampaignIds));
    }
    if (createdSegmentCardIds.length > 0) {
      await db
        .delete(segmentCards)
        .where(inArray(segmentCards.id, createdSegmentCardIds));
    }
    await db.delete(brandProfiles).where(eq(brandProfiles.id, brandProfileId));
  });

  async function insertDocument(version: number, status: string) {
    const [row] = await db
      .insert(emailDocuments)
      .values({
        campaignId,
        kind: "base",
        version,
        layoutId: "text_announcement",
        subject: `Subject v${version}`,
        preheader: `Preheader v${version}`,
        blocks: [
          {
            id: "headline",
            type: "headline",
            content: "Headline",
            editable: true,
            lockedForVariants: false,
          },
        ],
        sourceFacts: [],
        validationResults: [],
        renderedHtml: `<p>v${version}</p>`,
        plainText: `v${version} plain text`,
        status,
      })
      .returning();
    createdEmailDocumentIds.push(row.id);
    return row;
  }

  it("returns undefined when no generated document exists", async () => {
    const result = await getLatestGeneratedEmailDocument(campaignId);
    expect(result).toBeUndefined();
  });

  it("returns the generated document once one is persisted", async () => {
    await insertDocument(1, "generated");

    const result = await getLatestGeneratedEmailDocument(campaignId);
    expect(result?.subject).toBe("Subject v1");
    expect(result?.renderedHtml).toBe("<p>v1</p>");
  });

  it("prefers the latest version among multiple generated documents", async () => {
    await insertDocument(2, "generated");

    const result = await getLatestGeneratedEmailDocument(campaignId);
    expect(result?.version).toBe(2);
    expect(result?.subject).toBe("Subject v2");
  });

  it("ignores a higher-version document that is not status generated", async () => {
    await insertDocument(3, "failed");

    const result = await getLatestGeneratedEmailDocument(campaignId);
    expect(result?.version).toBe(2);
  });
});
