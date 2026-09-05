import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { saveBrandProfile } from "@/app/brand-profiles/actions";
import { saveCampaign, type CampaignFormInput } from "@/app/campaigns/actions";
import { db } from "@/db/client";
import { assets, brandProfiles, campaigns, emailDocuments, segmentCards } from "@/db/schema";
import { CampaignFactsSchema, LayoutIdSchema } from "@/domain/schemas";

import {
  EditConflictError,
  EditNotFoundError,
  EditValidationError,
} from "./apply-email-document-edit";
import { switchEmailDocumentLayout } from "./switch-email-document-layout";

describe("switchEmailDocumentLayout", () => {
  let brandProfileId: string;
  let campaignId: string;
  let heroAssetId: string;
  const createdCampaignIds: string[] = [];
  const createdSegmentCardIds: string[] = [];
  const createdEmailDocumentIds: string[] = [];
  const createdAssetIds: string[] = [];

  beforeAll(async () => {
    const profile = await saveBrandProfile({
      name: "Switch Layout Test Brand",
      colors: { primary: "#2563EB" },
      emailFontStack: "Arial, Helvetica, sans-serif",
      tone: ["Warm"],
      preferredTerms: [],
      prohibitedTerms: [],
      defaultCtaStyle: "filled",
      defaultFooterHtml: "Switch layout test footer",
    });
    brandProfileId = profile.id;

    const [assetRow] = await db
      .insert(assets)
      .values({
        type: "campaign_image",
        filename: "hero.png",
        mimeType: "image/png",
        sizeBytes: 100,
        storageKey: `switch-layout-test-${crypto.randomUUID()}.png`,
        width: 600,
        height: 300,
      })
      .returning();
    heroAssetId = assetRow.id;
    createdAssetIds.push(assetRow.id);

    const input: CampaignFormInput = {
      brandProfileId,
      name: "Switch Layout Test Campaign",
      campaignType: "feature_launch",
      objective: "awareness",
      brief: "Testing the switch-layout pipeline.",
      facts: CampaignFactsSchema.parse({
        ctaLabel: "Try it now",
        ctaUrl: "https://app.example.com/try",
        requiredClaims: [],
        requiredTerms: [],
        prohibitedClaims: [],
      }),
      selectedLayoutId: LayoutIdSchema.parse("hero_cta"),
      images: [{ assetId: heroAssetId }],
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

  async function insertHeroCtaV1() {
    const [row] = await db
      .insert(emailDocuments)
      .values({
        campaignId,
        kind: "base",
        version: 1,
        layoutId: "hero_cta",
        subject: "Original subject",
        preheader: "Original preheader",
        blocks: [
          {
            id: "hero_image",
            type: "image",
            assetId: heroAssetId,
            altText: "Original alt text",
            editable: true,
            lockedForVariants: false,
          },
          {
            id: "headline",
            type: "headline",
            content: "Original headline",
            editable: true,
            lockedForVariants: false,
          },
          {
            id: "body",
            type: "text",
            content: "Original body",
            editable: true,
            lockedForVariants: false,
          },
          {
            id: "cta",
            type: "button",
            label: "Try it now",
            href: "https://app.example.com/try",
            editable: true,
            lockedForVariants: false,
          },
          {
            id: "footer",
            type: "footer",
            html: "Switch layout test footer",
            editable: false,
            lockedForVariants: true,
          },
        ],
        sourceFacts: [],
        validationResults: [],
        renderedHtml: "<p>Original</p>",
        plainText: "Original",
        status: "generated",
      })
      .returning();
    createdEmailDocumentIds.push(row.id);
    return row;
  }

  async function insertHeroCtaV1WithEventDetails() {
    const [row] = await db
      .insert(emailDocuments)
      .values({
        campaignId,
        kind: "base",
        version: 1,
        layoutId: "hero_cta",
        subject: "Original subject",
        preheader: "Original preheader",
        blocks: [
          {
            id: "hero_image",
            type: "image",
            assetId: heroAssetId,
            altText: "Original alt text",
            editable: true,
            lockedForVariants: false,
          },
          {
            id: "headline",
            type: "headline",
            content: "Original headline",
            editable: true,
            lockedForVariants: false,
          },
          {
            id: "event_details",
            type: "text",
            content: "October 3 at 10am",
            editable: true,
            lockedForVariants: false,
          },
          {
            id: "body",
            type: "text",
            content: "Original body",
            editable: true,
            lockedForVariants: false,
          },
          {
            id: "cta",
            type: "button",
            label: "Try it now",
            href: "https://app.example.com/try",
            editable: true,
            lockedForVariants: false,
          },
          {
            id: "footer",
            type: "footer",
            html: "Switch layout test footer",
            editable: false,
            lockedForVariants: true,
          },
        ],
        sourceFacts: [],
        validationResults: [],
        renderedHtml: "<p>Original</p>",
        plainText: "Original",
        status: "generated",
      })
      .returning();
    createdEmailDocumentIds.push(row.id);
    return row;
  }

  beforeEach(async () => {
    await db.delete(emailDocuments).where(eq(emailDocuments.campaignId, campaignId));
  });

  it("switches hero_cta to text_announcement, keeping headline/body/cta/footer and dropping hero_image", async () => {
    const v1 = await insertHeroCtaV1();
    const result = await switchEmailDocumentLayout(campaignId, v1.id, 1, "text_announcement");
    createdEmailDocumentIds.push(result.id);

    expect(result.version).toBe(2);
    expect(result.parentEmailDocumentId).toBe(v1.id);
    expect(result.layoutId).toBe("text_announcement");

    expect(result.blocks.find((b) => b.id === "hero_image")).toBeUndefined();

    const headline = result.blocks.find((b) => b.id === "headline");
    expect(headline?.type === "headline" && headline.content).toBe("Original headline");

    const body = result.blocks.find((b) => b.id === "body");
    expect(body?.type === "text" && body.content).toBe("Original body");

    const cta = result.blocks.find((b) => b.id === "cta");
    expect(cta?.type === "button" && cta.label).toBe("Try it now");

    const footer = result.blocks.find((b) => b.type === "footer");
    expect(footer).toMatchObject({ html: "Switch layout test footer", editable: false });
  });

  it("keeps hero_image when switching hero_cta to webinar_event (both support hero_image)", async () => {
    // Uses the event_details-equipped fixture so this test isolates the
    // hero_image-carryover behavior from the missing-content rejection
    // covered separately below.
    const v1 = await insertHeroCtaV1WithEventDetails();
    const result = await switchEmailDocumentLayout(campaignId, v1.id, 1, "webinar_event");
    createdEmailDocumentIds.push(result.id);

    const heroImage = result.blocks.find((b) => b.id === "hero_image");
    expect(heroImage?.type === "image" && heroImage.assetId).toBe(heroAssetId);
    expect(heroImage?.type === "image" && heroImage.altText).toBe("Original alt text");
  });

  it("rejects a switch that would leave a required target slot without content, with no successor row", async () => {
    const v1 = await insertHeroCtaV1();

    await expect(
      switchEmailDocumentLayout(campaignId, v1.id, 1, "webinar_event"),
    ).rejects.toThrow(EditValidationError);

    const rows = await db.select().from(emailDocuments).where(eq(emailDocuments.campaignId, campaignId));
    expect(rows).toHaveLength(1);
  });

  it("rejects a switch into promotion_offer when the source has no offer_details content", async () => {
    const v1 = await insertHeroCtaV1();

    await expect(
      switchEmailDocumentLayout(campaignId, v1.id, 1, "promotion_offer"),
    ).rejects.toThrow(EditValidationError);

    const rows = await db.select().from(emailDocuments).where(eq(emailDocuments.campaignId, campaignId));
    expect(rows).toHaveLength(1);
  });

  it("leaves the historical version's layoutId and blocks unchanged", async () => {
    const v1 = await insertHeroCtaV1();
    const result = await switchEmailDocumentLayout(campaignId, v1.id, 1, "text_announcement");
    createdEmailDocumentIds.push(result.id);

    const [v1Row] = await db.select().from(emailDocuments).where(eq(emailDocuments.id, v1.id));
    expect(v1Row.layoutId).toBe("hero_cta");
    const v1Blocks = v1Row.blocks as Array<{ id: string }>;
    expect(v1Blocks.some((b) => b.id === "hero_image")).toBe(true);
  });

  it("throws EditValidationError when switching to the same layout (no successor row)", async () => {
    const v1 = await insertHeroCtaV1();

    await expect(
      switchEmailDocumentLayout(campaignId, v1.id, 1, "hero_cta"),
    ).rejects.toThrow(EditValidationError);

    const rows = await db.select().from(emailDocuments).where(eq(emailDocuments.campaignId, campaignId));
    expect(rows).toHaveLength(1);
  });

  it("returns a conflict error when expectedVersion is stale", async () => {
    const v1 = await insertHeroCtaV1();
    const v2 = await switchEmailDocumentLayout(campaignId, v1.id, 1, "text_announcement");
    createdEmailDocumentIds.push(v2.id);

    await expect(
      switchEmailDocumentLayout(campaignId, v1.id, 1, "promotion_offer"),
    ).rejects.toThrow(EditConflictError);

    const rows = await db.select().from(emailDocuments).where(eq(emailDocuments.campaignId, campaignId));
    expect(rows).toHaveLength(2);
  });

  it("throws EditNotFoundError for a nonexistent campaign", async () => {
    await expect(
      switchEmailDocumentLayout("00000000-0000-0000-0000-000000000000", "doc-1", 1, "text_announcement"),
    ).rejects.toThrow(EditNotFoundError);
  });

  it("throws EditNotFoundError for a nonexistent base document", async () => {
    await insertHeroCtaV1();
    await expect(
      switchEmailDocumentLayout(campaignId, "00000000-0000-0000-0000-000000000000", 1, "text_announcement"),
    ).rejects.toThrow(EditNotFoundError);
  });

  it("produces fresh rendered HTML for the new layout", async () => {
    const v1 = await insertHeroCtaV1();
    const result = await switchEmailDocumentLayout(campaignId, v1.id, 1, "text_announcement");
    createdEmailDocumentIds.push(result.id);

    expect(result.renderedHtml).toBeTruthy();
    expect(result.renderedHtml).not.toBe("<p>Original</p>");
    expect(result.plainText).toBeTruthy();
  });
});
