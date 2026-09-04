import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { saveBrandProfile } from "@/app/brand-profiles/actions";
import { db } from "@/db/client";
import { brandProfiles, campaigns, emailDocuments, segmentCards } from "@/db/schema";
import { CampaignFactsSchema, LayoutIdSchema } from "@/domain/schemas";

import {
  getEmailDocumentByCampaignAndVersion,
  listEmailDocumentVersions,
  saveCampaign,
  type CampaignFormInput,
} from "./actions";

describe("version loaders", () => {
  let brandProfileId: string;
  let campaignAId: string;
  let campaignBId: string;
  const createdCampaignIds: string[] = [];
  const createdSegmentCardIds: string[] = [];
  const createdEmailDocumentIds: string[] = [];

  beforeAll(async () => {
    const profile = await saveBrandProfile({
      name: "Version Loader Test Brand",
      colors: { primary: "#2563EB" },
      emailFontStack: "Arial, Helvetica, sans-serif",
      tone: ["Warm"],
      preferredTerms: [],
      prohibitedTerms: [],
      defaultCtaStyle: "filled",
      defaultFooterHtml: "Version loader test footer",
    });
    brandProfileId = profile.id;

    async function makeCampaign(name: string) {
      const input: CampaignFormInput = {
        brandProfileId,
        name,
        campaignType: "announcement",
        objective: "awareness",
        brief: "Testing version loaders.",
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
      createdCampaignIds.push(campaign.id);
      createdSegmentCardIds.push(campaign.segmentCard.id);
      return campaign.id;
    }

    campaignAId = await makeCampaign("Version Loader Campaign A");
    campaignBId = await makeCampaign("Version Loader Campaign B");
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

  async function insertDoc(campaignId: string, version: number) {
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
        plainText: `v${version}`,
        status: "generated",
      })
      .returning();
    createdEmailDocumentIds.push(row.id);
    return row;
  }

  it("lists versions newest first", async () => {
    await insertDoc(campaignAId, 1);
    await insertDoc(campaignAId, 2);

    const versions = await listEmailDocumentVersions(campaignAId);
    expect(versions.map((v) => v.version)).toEqual([2, 1]);
  });

  it("loads a specific version scoped to its campaign", async () => {
    const document = await getEmailDocumentByCampaignAndVersion(campaignAId, 1);
    expect(document?.subject).toBe("Subject v1");
  });

  it("never resolves a version number belonging to a different campaign", async () => {
    await insertDoc(campaignBId, 1);

    // campaignAId has version 2 too; campaignBId's own version 1 must not
    // leak across campaigns when queried under campaignAId.
    const crossCampaignAttempt = await getEmailDocumentByCampaignAndVersion(campaignAId, 1);
    expect(crossCampaignAttempt?.campaignId).toBe(campaignAId);

    const wrongCampaignVersion = await getEmailDocumentByCampaignAndVersion(campaignBId, 2);
    expect(wrongCampaignVersion).toBeUndefined();
  });

  it("returns undefined for a version that does not exist", async () => {
    const document = await getEmailDocumentByCampaignAndVersion(campaignAId, 999);
    expect(document).toBeUndefined();
  });
});
