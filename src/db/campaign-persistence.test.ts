import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { saveBrandProfile } from "@/app/brand-profiles/actions";
import { saveCampaign, type CampaignFormInput } from "@/app/campaigns/actions";
import { CampaignFactsSchema, LayoutIdSchema } from "@/domain/schemas";

import { db } from "./client";
import { brandProfiles, campaigns, segmentCards } from "./schema";

/**
 * Exercises the real local Postgres database configured via DATABASE_URL.
 * Requires the dev database to be running and migrated.
 */
describe("campaign + segment card persistence", () => {
  let brandProfileId: string;
  const createdCampaignIds: string[] = [];
  const createdSegmentCardIds: string[] = [];

  beforeAll(async () => {
    const profile = await saveBrandProfile({
      name: "Test Fixture Brand",
      colors: { primary: "#123456" },
      emailFontStack: "Arial, Helvetica, sans-serif",
      tone: ["Warm"],
      preferredTerms: [],
      prohibitedTerms: [],
      defaultCtaStyle: "filled",
      defaultFooterHtml: "Fixture footer",
    });
    brandProfileId = profile.id;
  });

  afterAll(async () => {
    // Scoped to only the rows this test file created — never a broad
    // table-wide delete against the shared dev database.
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

  it("creates a Campaign and inline Segment Card atomically and reads them back", async () => {
    const input: CampaignFormInput = {
      brandProfileId,
      name: "Autumn webinar",
      campaignType: "webinar",
      objective: "registrations",
      brief: "Invite active users to the autumn product webinar.",
      facts: CampaignFactsSchema.parse({
        ctaLabel: "Save my seat",
        ctaUrl: "https://example.com/webinar",
        eventDateText: "October 3, 2026",
        eventTimeText: "10:00 AM ET",
        speakerText: "Avery Chen",
        requiredClaims: [],
        requiredTerms: [],
        prohibitedClaims: [],
      }),
      selectedLayoutId: LayoutIdSchema.parse("webinar_event"),
      images: [],
      segmentCard: {
        name: "Active trial users",
        lifecycleStage: "trial",
        primaryMotivation: "See the product roadmap",
        primaryObjection: "Not sure it's worth the time",
        desiredAction: "Register for the webinar",
        messagingNotes: "Keep it casual.",
      },
    };

    const saved = await saveCampaign(input);
    createdCampaignIds.push(saved.id);
    createdSegmentCardIds.push(saved.segmentCard.id);

    expect(saved.brandProfileId).toBe(brandProfileId);
    expect(saved.selectedLayoutId).toBe("webinar_event");
    expect(saved.segmentCard.name).toBe("Active trial users");

    const parsedFacts = CampaignFactsSchema.parse(saved.facts);
    expect(parsedFacts.eventDateText).toBe("October 3, 2026");

    const [campaignRow] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, saved.id));
    expect(campaignRow.segmentCardId).toBe(saved.segmentCard.id);

    const [segmentRow] = await db
      .select()
      .from(segmentCards)
      .where(eq(segmentCards.id, saved.segmentCard.id));
    expect(segmentRow.primaryMotivation).toBe("See the product roadmap");
  });

  it("does not leave an orphan Segment Card when the Campaign write fails", async () => {
    // Unique name scoped to this test/run — a whole-table count races
    // against other test files' parallel inserts and deletes against the
    // shared dev database, so identify this test's own row instead.
    const orphanCheckSegmentName = `Orphan check segment ${crypto.randomUUID()}`;

    const input: CampaignFormInput = {
      brandProfileId: "00000000-0000-0000-0000-000000000000",
      name: "Broken campaign",
      campaignType: "announcement",
      objective: "awareness",
      brief: "This should fail because the brand profile does not exist.",
      facts: CampaignFactsSchema.parse({
        ctaLabel: "Learn more",
        ctaUrl: "https://example.com",
        requiredClaims: [],
        requiredTerms: [],
        prohibitedClaims: [],
      }),
      selectedLayoutId: LayoutIdSchema.parse("text_announcement"),
      images: [],
      segmentCard: {
        name: orphanCheckSegmentName,
        primaryMotivation: "N/A",
        primaryObjection: "N/A",
        desiredAction: "N/A",
      },
    };

    await expect(saveCampaign(input)).rejects.toThrow();

    const orphanRows = await db
      .select()
      .from(segmentCards)
      .where(eq(segmentCards.name, orphanCheckSegmentName));
    expect(orphanRows).toHaveLength(0);
  });
});
