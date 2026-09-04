import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { saveBrandProfile } from "@/app/brand-profiles/actions";
import { saveCampaign, type CampaignFormInput } from "@/app/campaigns/actions";
import { db } from "@/db/client";
import { assets, brandProfiles, campaigns, emailDocuments, segmentCards } from "@/db/schema";
import { CampaignFactsSchema, LayoutIdSchema } from "@/domain/schemas";

import { POST } from "./route";

function buildRequest(body: unknown): Request {
  return new Request("http://localhost/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function buildParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/campaigns/[id]/email-documents/replace-image", () => {
  let brandProfileId: string;
  let campaignId: string;
  let oldAssetId: string;
  let newAssetId: string;
  const createdCampaignIds: string[] = [];
  const createdSegmentCardIds: string[] = [];
  const createdEmailDocumentIds: string[] = [];
  const createdAssetIds: string[] = [];

  beforeAll(async () => {
    const profile = await saveBrandProfile({
      name: "Replace Image Route Test Brand",
      colors: { primary: "#2563EB" },
      emailFontStack: "Arial, Helvetica, sans-serif",
      tone: ["Warm"],
      preferredTerms: [],
      prohibitedTerms: [],
      defaultCtaStyle: "filled",
      defaultFooterHtml: "Replace image route test footer",
    });
    brandProfileId = profile.id;

    const [oldAsset] = await db
      .insert(assets)
      .values({
        type: "campaign_image",
        filename: "old-hero.png",
        mimeType: "image/png",
        sizeBytes: 100,
        storageKey: `replace-image-route-old-${crypto.randomUUID()}.png`,
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
        storageKey: `replace-image-route-new-${crypto.randomUUID()}.png`,
        width: 600,
        height: 300,
      })
      .returning();
    newAssetId = newAsset.id;
    createdAssetIds.push(newAsset.id);

    const input: CampaignFormInput = {
      brandProfileId,
      name: "Replace Image Route Test Campaign",
      campaignType: "feature_launch",
      objective: "awareness",
      brief: "Testing the replace-image route.",
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

  beforeEach(async () => {
    await db.delete(emailDocuments).where(eq(emailDocuments.campaignId, campaignId));
    await db.update(campaigns).set({ assetIds: [oldAssetId] }).where(eq(campaigns.id, campaignId));
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
            html: "Replace image route test footer",
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

  it("returns 201 with the new version on a valid replace-image request", async () => {
    const v1 = await insertV1();
    const response = await POST(
      buildRequest({ baseDocumentId: v1.id, expectedVersion: 1, assetId: newAssetId }),
      buildParams(campaignId),
    );
    const body = await response.json();
    if (response.status === 201) createdEmailDocumentIds.push(body.documentId);

    expect(response.status).toBe(201);
    expect(body.version).toBe(2);
  });

  it("returns 400 for a malformed body without leaking internals", async () => {
    const response = await POST(
      buildRequest({ assetId: 123 }),
      buildParams(campaignId),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
    expect(body.error).not.toMatch(/SELECT|INSERT|stack|at\s+\w+\s+\(/i);
  });

  it("returns 400 when the selected asset is already the current image", async () => {
    const v1 = await insertV1();
    const response = await POST(
      buildRequest({ baseDocumentId: v1.id, expectedVersion: 1, assetId: oldAssetId }),
      buildParams(campaignId),
    );
    expect(response.status).toBe(400);
  });

  it("returns 404 for a nonexistent campaign", async () => {
    const response = await POST(
      buildRequest({
        baseDocumentId: "00000000-0000-0000-0000-000000000000",
        expectedVersion: 1,
        assetId: newAssetId,
      }),
      buildParams("00000000-0000-0000-0000-000000000000"),
    );
    expect(response.status).toBe(404);
  });

  it("returns 404 for a nonexistent asset id", async () => {
    const v1 = await insertV1();
    const response = await POST(
      buildRequest({
        baseDocumentId: v1.id,
        expectedVersion: 1,
        assetId: "00000000-0000-0000-0000-000000000000",
      }),
      buildParams(campaignId),
    );
    expect(response.status).toBe(404);
  });

  it("returns 409 for a stale expectedVersion", async () => {
    const v1 = await insertV1();
    const first = await POST(
      buildRequest({ baseDocumentId: v1.id, expectedVersion: 1, assetId: newAssetId }),
      buildParams(campaignId),
    );
    const firstBody = await first.json();
    createdEmailDocumentIds.push(firstBody.documentId);

    const second = await POST(
      buildRequest({ baseDocumentId: v1.id, expectedVersion: 1, assetId: newAssetId }),
      buildParams(campaignId),
    );
    expect(second.status).toBe(409);
    const secondBody = await second.json();
    expect(secondBody.latestVersion).toBe(2);
  });
});
