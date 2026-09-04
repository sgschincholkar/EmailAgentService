import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { saveBrandProfile } from "@/app/brand-profiles/actions";
import { saveCampaign, type CampaignFormInput } from "@/app/campaigns/actions";
import { db } from "@/db/client";
import { brandProfiles, campaigns, emailDocuments, segmentCards } from "@/db/schema";
import { CampaignFactsSchema, LayoutIdSchema } from "@/domain/schemas";

import * as claudeClient from "./claude-client";
import { GenerationFailedError, generateCampaignEmail } from "./generate-campaign-email";
import { PreflightError } from "./preflight-check";

const validModelResponse = JSON.stringify({
  campaignAngle: "Focus on speed and simplicity.",
  subjectLineOptions: ["Subject A", "Subject B", "Subject C"],
  selectedSubjectLine: "Subject A",
  preheader: "A short preview line.",
  blocks: [
    { slotId: "headline", type: "text", content: "Your new home base" },
    { slotId: "body", type: "text", content: "Everything in one place." },
  ],
  assumptions: [],
  missingInputs: [],
  warnings: [],
});

describe("generateCampaignEmail", () => {
  let brandProfileId: string;
  let campaignId: string;
  const createdCampaignIds: string[] = [];
  const createdSegmentCardIds: string[] = [];

  beforeAll(async () => {
    const profile = await saveBrandProfile({
      name: "Generation Test Brand",
      colors: { primary: "#2563EB" },
      emailFontStack: "Arial, Helvetica, sans-serif",
      tone: ["Warm"],
      preferredTerms: [],
      prohibitedTerms: [],
      defaultCtaStyle: "filled",
      defaultFooterHtml: "Generation test footer",
    });
    brandProfileId = profile.id;

    const input: CampaignFormInput = {
      brandProfileId,
      name: "Generation Test Campaign",
      campaignType: "announcement",
      objective: "awareness",
      brief: "Announce the launch.",
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
    // Scoped to only the rows this test file created — never a broad
    // table-wide delete against the shared dev database.
    if (createdCampaignIds.length > 0) {
      await db
        .delete(emailDocuments)
        .where(inArray(emailDocuments.campaignId, createdCampaignIds));
      await db.delete(campaigns).where(inArray(campaigns.id, createdCampaignIds));
    }
    if (createdSegmentCardIds.length > 0) {
      await db
        .delete(segmentCards)
        .where(inArray(segmentCards.id, createdSegmentCardIds));
    }
    await db.delete(brandProfiles).where(eq(brandProfiles.id, brandProfileId));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("persists an EmailDocument and sets status generated on a successful pipeline", async () => {
    vi.spyOn(claudeClient, "callClaude").mockResolvedValue(validModelResponse);

    const document = await generateCampaignEmail(campaignId);

    expect(document.renderedHtml).toBeTruthy();
    expect(document.plainText).toBeTruthy();
    expect(document.version).toBe(1);

    const [row] = await db
      .select()
      .from(emailDocuments)
      .where(eq(emailDocuments.id, document.id));
    expect(row).toBeDefined();
    expect(row.renderedHtml).toBeTruthy();

    const [campaignRow] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId));
    expect(campaignRow.status).toBe("generated");
  });

  it("leaves no partial EmailDocument and sets status failed when the model output never validates", async () => {
    vi.spyOn(claudeClient, "callClaude").mockResolvedValue('{"not":"valid"}');

    // Scoped to this test's own campaign, not a whole-table count — a
    // table-wide count races against other test files' parallel inserts
    // and deletes against the shared dev database.
    const beforeRows = await db
      .select()
      .from(emailDocuments)
      .where(eq(emailDocuments.campaignId, campaignId));

    await expect(generateCampaignEmail(campaignId)).rejects.toThrow(GenerationFailedError);

    const afterRows = await db
      .select()
      .from(emailDocuments)
      .where(eq(emailDocuments.campaignId, campaignId));
    expect(afterRows.length).toBe(beforeRows.length);

    const [campaignRow] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId));
    expect(campaignRow.status).toBe("failed");
  });

  it("blocks generation before calling Claude when the campaign has no CTA", async () => {
    const noCtaInput: CampaignFormInput = {
      brandProfileId,
      name: "No CTA Campaign",
      campaignType: "announcement",
      objective: "awareness",
      brief: "Missing CTA on purpose.",
      facts: CampaignFactsSchema.parse({
        ctaLabel: "placeholder",
        ctaUrl: "https://example.com",
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
    const campaign = await saveCampaign(noCtaInput);
    createdCampaignIds.push(campaign.id);
    createdSegmentCardIds.push(campaign.segmentCard.id);

    // Simulate a missing CTA by clearing facts directly, since the schema
    // requires ctaLabel/ctaUrl at save time.
    await db
      .update(campaigns)
      .set({ facts: { ctaLabel: "", ctaUrl: "", requiredClaims: [], requiredTerms: [], prohibitedClaims: [] } })
      .where(eq(campaigns.id, campaign.id));

    const callSpy = vi.spyOn(claudeClient, "callClaude");

    await expect(generateCampaignEmail(campaign.id)).rejects.toThrow(PreflightError);
    expect(callSpy).not.toHaveBeenCalled();

    const [campaignRow] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaign.id));
    // Preflight rejection is not a failed generation attempt.
    expect(campaignRow.status).toBe("draft");
  });
});
