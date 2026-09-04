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
import { replaceEmailDocumentImage } from "./replace-email-document-image";

describe("replaceEmailDocumentImage", () => {
  let brandProfileId: string;
  let campaignId: string;
  let oldAssetId: string;
  let newAssetId: string;
  let logoAssetId: string;
  const createdCampaignIds: string[] = [];
  const createdSegmentCardIds: string[] = [];
  const createdEmailDocumentIds: string[] = [];
  const createdAssetIds: string[] = [];

  beforeAll(async () => {
    const profile = await saveBrandProfile({
      name: "Replace Image Test Brand",
      colors: { primary: "#2563EB" },
      emailFontStack: "Arial, Helvetica, sans-serif",
      tone: ["Warm"],
      preferredTerms: [],
      prohibitedTerms: [],
      defaultCtaStyle: "filled",
      defaultFooterHtml: "Replace image test footer",
    });
    brandProfileId = profile.id;

    const [oldAsset] = await db
      .insert(assets)
      .values({
        type: "campaign_image",
        filename: "old-hero.png",
        mimeType: "image/png",
        sizeBytes: 100,
        storageKey: `replace-image-test-old-${crypto.randomUUID()}.png`,
        width: 600,
        height: 300,
      })
      .returning();
    oldAssetId = oldAsset.id;
    createdAssetIds.push(oldAsset.id);

    const [newAsset] = await db
      .insert(assets)
      .values({
        type: "campaign_image",
        filename: "new-hero.png",
        mimeType: "image/png",
        sizeBytes: 100,
        storageKey: `replace-image-test-new-${crypto.randomUUID()}.png`,
        width: 600,
        height: 300,
      })
      .returning();
    newAssetId = newAsset.id;
    createdAssetIds.push(newAsset.id);

    const [logoAsset] = await db
      .insert(assets)
      .values({
        type: "logo",
        filename: "logo.png",
        mimeType: "image/png",
        sizeBytes: 100,
        storageKey: `replace-image-test-logo-${crypto.randomUUID()}.png`,
        width: 200,
        height: 200,
      })
      .returning();
    logoAssetId = logoAsset.id;
    createdAssetIds.push(logoAsset.id);

    const input: CampaignFormInput = {
      brandProfileId,
      name: "Replace Image Test Campaign",
      campaignType: "feature_launch",
      objective: "awareness",
      brief: "Testing the replace-image pipeline.",
      facts: CampaignFactsSchema.parse({
        ctaLabel: "Try it now",
        ctaUrl: "https://app.example.com/try",
        requiredClaims: [],
        requiredTerms: [],
        prohibitedClaims: [],
      }),
      selectedLayoutId: LayoutIdSchema.parse("hero_cta"),
      images: [{ assetId: oldAssetId }],
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

  async function insertV1() {
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
            assetId: oldAssetId,
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
            html: "Replace image test footer",
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
    // Reset assetIds to the original single-asset state before each test so
    // "already present" assertions start from a known baseline.
    await db.update(campaigns).set({ assetIds: [oldAssetId] }).where(eq(campaigns.id, campaignId));
  });

  it("creates v2 with only hero_image.assetId changed, alt text unchanged", async () => {
    const v1 = await insertV1();
    const result = await replaceEmailDocumentImage(campaignId, v1.id, 1, newAssetId);
    createdEmailDocumentIds.push(result.id);

    expect(result.version).toBe(2);
    expect(result.parentEmailDocumentId).toBe(v1.id);

    const heroImage = result.blocks.find((b) => b.id === "hero_image");
    expect(heroImage?.type === "image" && heroImage.assetId).toBe(newAssetId);
    expect(heroImage?.type === "image" && heroImage.altText).toBe("Original alt text");

    expect(result.subject).toBe("Original subject");
    expect(result.preheader).toBe("Original preheader");

    const headline = result.blocks.find((b) => b.id === "headline");
    expect(headline?.type === "headline" && headline.content).toBe("Original headline");

    const cta = result.blocks.find((b) => b.id === "cta");
    expect(cta?.type === "button" && cta.label).toBe("Try it now");

    const footer = result.blocks.find((b) => b.type === "footer");
    expect(footer).toMatchObject({ html: "Replace image test footer" });
  });

  it("leaves the historical version's block pointing at the old asset", async () => {
    const v1 = await insertV1();
    const result = await replaceEmailDocumentImage(campaignId, v1.id, 1, newAssetId);
    createdEmailDocumentIds.push(result.id);

    const [v1Row] = await db.select().from(emailDocuments).where(eq(emailDocuments.id, v1.id));
    const v1Blocks = v1Row.blocks as Array<{ id: string; assetId?: string }>;
    const v1Hero = v1Blocks.find((b) => b.id === "hero_image");
    expect(v1Hero?.assetId).toBe(oldAssetId);
  });

  it("appends the new asset id to Campaign.assetIds without removing the old one", async () => {
    const v1 = await insertV1();
    await replaceEmailDocumentImage(campaignId, v1.id, 1, newAssetId);

    const [campaignRow] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId));
    expect(campaignRow.assetIds).toEqual(expect.arrayContaining([oldAssetId, newAssetId]));
    expect(campaignRow.assetIds).toHaveLength(2);
  });

  it("produces fresh rendered HTML referencing the new asset", async () => {
    const v1 = await insertV1();
    const result = await replaceEmailDocumentImage(campaignId, v1.id, 1, newAssetId);
    createdEmailDocumentIds.push(result.id);

    expect(result.renderedHtml).toBeTruthy();
    expect(result.renderedHtml).not.toBe("<p>Original</p>");
  });

  it("allows an asset already in Campaign.assetIds (but not the current image) without duplication", async () => {
    await db
      .update(campaigns)
      .set({ assetIds: [oldAssetId, newAssetId] })
      .where(eq(campaigns.id, campaignId));
    const v1 = await insertV1();

    const result = await replaceEmailDocumentImage(campaignId, v1.id, 1, newAssetId);
    createdEmailDocumentIds.push(result.id);

    const [campaignRow] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId));
    expect(campaignRow.assetIds).toEqual([oldAssetId, newAssetId]);
  });

  it("throws EditValidationError when the selected asset is already the current image (no successor row)", async () => {
    const v1 = await insertV1();

    await expect(
      replaceEmailDocumentImage(campaignId, v1.id, 1, oldAssetId),
    ).rejects.toThrow(EditValidationError);

    const rows = await db.select().from(emailDocuments).where(eq(emailDocuments.campaignId, campaignId));
    expect(rows).toHaveLength(1);
  });

  it("throws EditValidationError for a non-campaign_image asset type (no successor row)", async () => {
    const v1 = await insertV1();

    await expect(
      replaceEmailDocumentImage(campaignId, v1.id, 1, logoAssetId),
    ).rejects.toThrow(EditValidationError);

    const rows = await db.select().from(emailDocuments).where(eq(emailDocuments.campaignId, campaignId));
    expect(rows).toHaveLength(1);
  });

  it("throws EditNotFoundError for a nonexistent asset id (no successor row)", async () => {
    const v1 = await insertV1();

    await expect(
      replaceEmailDocumentImage(campaignId, v1.id, 1, "00000000-0000-0000-0000-000000000000"),
    ).rejects.toThrow(EditNotFoundError);

    const rows = await db.select().from(emailDocuments).where(eq(emailDocuments.campaignId, campaignId));
    expect(rows).toHaveLength(1);
  });

  it("throws EditValidationError when the document has no hero_image block", async () => {
    const [row] = await db
      .insert(emailDocuments)
      .values({
        campaignId,
        kind: "base",
        version: 1,
        layoutId: "text_announcement",
        subject: "No image subject",
        preheader: "No image preheader",
        blocks: [
          {
            id: "headline",
            type: "headline",
            content: "Headline",
            editable: true,
            lockedForVariants: false,
          },
          {
            id: "body",
            type: "text",
            content: "Body",
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
            html: "Replace image test footer",
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

    await expect(
      replaceEmailDocumentImage(campaignId, row.id, 1, newAssetId),
    ).rejects.toThrow(EditValidationError);

    const rows = await db.select().from(emailDocuments).where(eq(emailDocuments.campaignId, campaignId));
    expect(rows).toHaveLength(1);
  });

  it("returns a conflict error when expectedVersion is stale", async () => {
    const v1 = await insertV1();
    const v2 = await replaceEmailDocumentImage(campaignId, v1.id, 1, newAssetId);
    createdEmailDocumentIds.push(v2.id);

    await expect(
      replaceEmailDocumentImage(campaignId, v1.id, 1, newAssetId),
    ).rejects.toThrow(EditConflictError);

    const rows = await db.select().from(emailDocuments).where(eq(emailDocuments.campaignId, campaignId));
    expect(rows).toHaveLength(2);
  });

  it("throws EditNotFoundError for a nonexistent campaign", async () => {
    await expect(
      replaceEmailDocumentImage("00000000-0000-0000-0000-000000000000", "doc-1", 1, newAssetId),
    ).rejects.toThrow(EditNotFoundError);
  });
});
