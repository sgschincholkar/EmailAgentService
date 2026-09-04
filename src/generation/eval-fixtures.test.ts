import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { saveBrandProfile } from "@/app/brand-profiles/actions";
import { saveCampaign, type CampaignFormInput } from "@/app/campaigns/actions";
import { db } from "@/db/client";
import { assets, brandProfiles, campaigns, emailDocuments, segmentCards } from "@/db/schema";
import { CampaignFactsSchema, LayoutIdSchema } from "@/domain/schemas";

import * as claudeClient from "./claude-client";
import { generateCampaignEmail } from "./generate-campaign-email";

/**
 * Slice 6 automated coverage: one representative fixture per layout, run
 * through the real pipeline with a mocked Claude response — validates
 * schema shape + renderer run, not output quality. Output-quality review
 * (fact grounding, brand fidelity, copy, tone) happened manually against
 * 18 real Claude generations and is documented in
 * docs/slice-6-evaluation-results.md, not repeated here.
 */
const mockModelOutputFor = (blocks: Array<{ slotId: string; type: "text" | "image" }>) =>
  JSON.stringify({
    campaignAngle: "Evaluation fixture angle.",
    subjectLineOptions: ["Subject A", "Subject B", "Subject C"],
    selectedSubjectLine: "Subject A",
    preheader: "Evaluation fixture preheader.",
    blocks: blocks.map((block) =>
      block.type === "image"
        ? { slotId: block.slotId, type: "image", altText: "Evaluation fixture alt text." }
        : { slotId: block.slotId, type: "text", content: "Evaluation fixture copy." },
    ),
    assumptions: [],
    missingInputs: [],
    warnings: [],
  });

describe("Slice 6 evaluation fixtures — pipeline regression (mocked Claude)", () => {
  let brandProfileId: string;
  let heroAssetId: string;
  const createdCampaignIds: string[] = [];
  const createdSegmentCardIds: string[] = [];
  const createdEmailDocumentIds: string[] = [];
  const createdAssetIds: string[] = [];

  beforeAll(async () => {
    const profile = await saveBrandProfile({
      name: "[Eval Test] Pipeline Fixture Brand",
      colors: { primary: "#2563EB" },
      emailFontStack: "Arial, Helvetica, sans-serif",
      tone: ["Professional"],
      preferredTerms: [],
      prohibitedTerms: [],
      defaultCtaStyle: "filled",
      defaultFooterHtml: "Eval test fixture footer",
    });
    brandProfileId = profile.id;

    const [assetRow] = await db
      .insert(assets)
      .values({
        type: "campaign_image",
        filename: "eval-test-hero.png",
        mimeType: "image/png",
        sizeBytes: 100,
        storageKey: `eval-test-${crypto.randomUUID()}.png`,
        width: 600,
        height: 300,
      })
      .returning();
    heroAssetId = assetRow.id;
    createdAssetIds.push(assetRow.id);
  });

  afterAll(async () => {
    if (createdEmailDocumentIds.length > 0) {
      await db.delete(emailDocuments).where(inArray(emailDocuments.id, createdEmailDocumentIds));
    }
    if (createdCampaignIds.length > 0) {
      await db.delete(campaigns).where(inArray(campaigns.id, createdCampaignIds));
    }
    if (createdSegmentCardIds.length > 0) {
      await db.delete(segmentCards).where(inArray(segmentCards.id, createdSegmentCardIds));
    }
    if (createdAssetIds.length > 0) {
      await db.delete(assets).where(inArray(assets.id, createdAssetIds));
    }
    await db.delete(brandProfiles).where(eq(brandProfiles.id, brandProfileId));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function createCampaignForLayout(
    layoutId: "hero_cta" | "webinar_event" | "text_announcement" | "promotion_offer",
  ) {
    const needsImage = layoutId === "hero_cta" || layoutId === "promotion_offer";
    const facts = CampaignFactsSchema.parse({
      ctaLabel: "Learn more",
      ctaUrl: "https://example.com",
      ...(layoutId === "webinar_event"
        ? { eventDateText: "November 1, 2026", eventTimeText: "10:00 AM ET", speakerText: "Test Speaker" }
        : {}),
      ...(layoutId === "promotion_offer" ? { offerText: "10% off", discountText: "10% off" } : {}),
      requiredClaims: [],
      requiredTerms: [],
      prohibitedClaims: [],
    });

    const input: CampaignFormInput = {
      brandProfileId,
      name: `[Eval Test] ${layoutId} fixture`,
      campaignType: layoutId === "webinar_event" ? "webinar" : "announcement",
      objective: "awareness",
      brief: `Evaluation fixture regression test for the ${layoutId} layout.`,
      facts,
      selectedLayoutId: LayoutIdSchema.parse(layoutId),
      images: needsImage ? [{ assetId: heroAssetId }] : [],
      segmentCard: {
        name: "Eval test segment",
        primaryMotivation: "Fixture motivation",
        primaryObjection: "Fixture objection",
        desiredAction: "Fixture action",
      },
    };
    const campaign = await saveCampaign(input);
    createdCampaignIds.push(campaign.id);
    createdSegmentCardIds.push(campaign.segmentCard.id);
    return campaign;
  }

  const LAYOUT_SLOT_FIXTURES: Record<
    "hero_cta" | "webinar_event" | "text_announcement" | "promotion_offer",
    Array<{ slotId: string; type: "text" | "image" }>
  > = {
    hero_cta: [
      { slotId: "hero_image", type: "image" },
      { slotId: "headline", type: "text" },
      { slotId: "body", type: "text" },
    ],
    webinar_event: [
      { slotId: "headline", type: "text" },
      { slotId: "event_details", type: "text" },
      { slotId: "body", type: "text" },
    ],
    text_announcement: [
      { slotId: "headline", type: "text" },
      { slotId: "body", type: "text" },
    ],
    promotion_offer: [
      { slotId: "hero_image", type: "image" },
      { slotId: "headline", type: "text" },
      { slotId: "offer_details", type: "text" },
      { slotId: "body", type: "text" },
    ],
  };

  it.each([
    ["hero_cta"],
    ["webinar_event"],
    ["text_announcement"],
    ["promotion_offer"],
  ] as const)("generates without pipeline error for layout %s", async (layoutId) => {
    vi.spyOn(claudeClient, "callClaude").mockResolvedValue(
      mockModelOutputFor(LAYOUT_SLOT_FIXTURES[layoutId]),
    );

    const campaign = await createCampaignForLayout(layoutId);
    const document = await generateCampaignEmail(campaign.id);
    createdEmailDocumentIds.push(document.id);

    expect(document.renderedHtml).toBeTruthy();
    expect(document.plainText).toBeTruthy();
    expect(document.layoutId).toBe(layoutId);
  });
});
