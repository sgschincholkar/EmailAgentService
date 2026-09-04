import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { saveBrandProfile } from "@/app/brand-profiles/actions";
import { saveCampaign, type CampaignFormInput } from "@/app/campaigns/actions";
import { db } from "@/db/client";
import { brandProfiles, campaigns, emailDocuments, segmentCards } from "@/db/schema";
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

describe("POST /api/campaigns/[id]/email-documents/edit", () => {
  let brandProfileId: string;
  let campaignId: string;
  const createdCampaignIds: string[] = [];
  const createdSegmentCardIds: string[] = [];
  const createdEmailDocumentIds: string[] = [];

  beforeAll(async () => {
    const profile = await saveBrandProfile({
      name: "Edit Route Test Brand",
      colors: { primary: "#2563EB" },
      emailFontStack: "Arial, Helvetica, sans-serif",
      tone: ["Warm"],
      preferredTerms: [],
      prohibitedTerms: [],
      defaultCtaStyle: "filled",
      defaultFooterHtml: "Edit route test footer",
    });
    brandProfileId = profile.id;

    const input: CampaignFormInput = {
      brandProfileId,
      name: "Edit Route Test Campaign",
      campaignType: "announcement",
      objective: "awareness",
      brief: "Testing the edit route.",
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

  beforeEach(async () => {
    // Each test starts from a clean, campaign-scoped document state so
    // version-number assertions stay independent across tests.
    await db.delete(emailDocuments).where(eq(emailDocuments.campaignId, campaignId));
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

  async function insertV1() {
    const [row] = await db
      .insert(emailDocuments)
      .values({
        campaignId,
        kind: "base",
        version: 1,
        layoutId: "text_announcement",
        subject: "Original subject",
        preheader: "Original preheader",
        blocks: [
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
            html: "Edit route test footer",
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

  it("returns 201 with the new version on a valid edit", async () => {
    const v1 = await insertV1();
    const response = await POST(
      buildRequest({
        baseDocumentId: v1.id,
        expectedVersion: 1,
        edits: [{ target: "document", field: "subject", value: "Route-tested subject" }],
      }),
      buildParams(campaignId),
    );
    const body = await response.json();
    if (response.status === 201) createdEmailDocumentIds.push(body.documentId);

    expect(response.status).toBe(201);
    expect(body.version).toBe(2);
  });

  it("returns 400 for a malformed edit body without leaking internals", async () => {
    const response = await POST(
      buildRequest({ edits: "not-an-array" }),
      buildParams(campaignId),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
    expect(body.error).not.toMatch(/SELECT|INSERT|stack|at\s+\w+\s+\(/i);
  });

  it("returns 404 for a nonexistent campaign", async () => {
    const response = await POST(
      buildRequest({
        baseDocumentId: "00000000-0000-0000-0000-000000000000",
        expectedVersion: 1,
        edits: [{ target: "document", field: "subject", value: "x" }],
      }),
      buildParams("00000000-0000-0000-0000-000000000000"),
    );
    expect(response.status).toBe(404);
  });

  it("returns 409 for a stale expectedVersion", async () => {
    const v1 = await insertV1();
    const first = await POST(
      buildRequest({
        baseDocumentId: v1.id,
        expectedVersion: 1,
        edits: [{ target: "document", field: "subject", value: "First edit" }],
      }),
      buildParams(campaignId),
    );
    const firstBody = await first.json();
    createdEmailDocumentIds.push(firstBody.documentId);

    const second = await POST(
      buildRequest({
        baseDocumentId: v1.id,
        expectedVersion: 1,
        edits: [{ target: "document", field: "subject", value: "Stale edit" }],
      }),
      buildParams(campaignId),
    );
    expect(second.status).toBe(409);
    const secondBody = await second.json();
    expect(secondBody.latestVersion).toBe(2);
  });
});
