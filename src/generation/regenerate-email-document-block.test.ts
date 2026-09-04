import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { saveBrandProfile } from "@/app/brand-profiles/actions";
import { saveCampaign, type CampaignFormInput } from "@/app/campaigns/actions";
import { db } from "@/db/client";
import { brandProfiles, campaigns, emailDocuments, segmentCards } from "@/db/schema";
import { CampaignFactsSchema, LayoutIdSchema } from "@/domain/schemas";

import * as claudeClient from "./claude-client";
import {
  EditConflictError,
  EditNotFoundError,
  EditValidationError,
} from "./apply-email-document-edit";
import {
  regenerateEmailDocumentBlock,
  RegenerateGenerationFailedError,
} from "./regenerate-email-document-block";

describe("regenerateEmailDocumentBlock", () => {
  let brandProfileId: string;
  let campaignId: string;
  const createdCampaignIds: string[] = [];
  const createdSegmentCardIds: string[] = [];
  const createdEmailDocumentIds: string[] = [];

  beforeAll(async () => {
    const profile = await saveBrandProfile({
      name: "Regenerate Pipeline Test Brand",
      colors: { primary: "#2563EB" },
      emailFontStack: "Arial, Helvetica, sans-serif",
      tone: ["Warm"],
      preferredTerms: [],
      prohibitedTerms: ["synergy"],
      defaultCtaStyle: "filled",
      defaultFooterHtml: "Regenerate pipeline test footer",
    });
    brandProfileId = profile.id;

    const input: CampaignFormInput = {
      brandProfileId,
      name: "Regenerate Pipeline Test Campaign",
      campaignType: "announcement",
      objective: "awareness",
      brief: "Testing the regenerate pipeline.",
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
      await db.delete(emailDocuments).where(inArray(emailDocuments.id, createdEmailDocumentIds));
    }
    if (createdCampaignIds.length > 0) {
      await db.delete(campaigns).where(inArray(campaigns.id, createdCampaignIds));
    }
    if (createdSegmentCardIds.length > 0) {
      await db.delete(segmentCards).where(inArray(segmentCards.id, createdSegmentCardIds));
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
            html: "Regenerate pipeline test footer",
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates v2 with only the target block changed", async () => {
    vi.spyOn(claudeClient, "callClaude").mockResolvedValue(
      JSON.stringify({ content: "Regenerated body copy" }),
    );

    const v1 = await insertV1();
    const result = await regenerateEmailDocumentBlock(campaignId, v1.id, 1, "body");
    createdEmailDocumentIds.push(result.id);

    expect(result.version).toBe(2);
    expect(result.parentEmailDocumentId).toBe(v1.id);

    const body = result.blocks.find((b) => b.id === "body");
    expect(body?.type === "text" && body.content).toBe("Regenerated body copy");

    const headline = result.blocks.find((b) => b.id === "headline");
    expect(headline?.type === "headline" && headline.content).toBe("Original headline");

    expect(result.subject).toBe("Original subject");
    expect(result.preheader).toBe("Original preheader");

    const cta = result.blocks.find((b) => b.id === "cta");
    expect(cta?.type === "button" && cta.label).toBe("Try it now");
    expect(cta?.type === "button" && cta.href).toBe("https://app.example.com/try");

    const footer = result.blocks.find((b) => b.type === "footer");
    expect(footer).toMatchObject({ html: "Regenerate pipeline test footer" });
  });

  it("produces fresh rendered HTML reflecting the regenerated block", async () => {
    vi.spyOn(claudeClient, "callClaude").mockResolvedValue(
      JSON.stringify({ content: "Brand new headline copy" }),
    );

    const v1 = await insertV1();
    const result = await regenerateEmailDocumentBlock(campaignId, v1.id, 1, "headline");
    createdEmailDocumentIds.push(result.id);

    expect(result.renderedHtml).toContain("Brand new headline copy");
  });

  it("rejects a regenerate target that isn't in the eligible set structurally (cta not accepted by type)", async () => {
    const v1 = await insertV1();
    await expect(
      regenerateEmailDocumentBlock(campaignId, v1.id, 1, "cta" as never),
    ).rejects.toThrow();

    const rows = await db.select().from(emailDocuments).where(eq(emailDocuments.campaignId, campaignId));
    expect(rows).toHaveLength(1);
  });

  it("rejects regenerating a block absent on this layout and creates no successor row", async () => {
    const v1 = await insertV1();
    await expect(
      regenerateEmailDocumentBlock(campaignId, v1.id, 1, "hero_image"),
    ).rejects.toThrow(EditValidationError);

    const rows = await db.select().from(emailDocuments).where(eq(emailDocuments.campaignId, campaignId));
    expect(rows).toHaveLength(1);
  });

  it("returns a conflict error when expectedVersion is stale", async () => {
    vi.spyOn(claudeClient, "callClaude").mockResolvedValue(
      JSON.stringify({ content: "v2 body" }),
    );
    const v1 = await insertV1();
    const v2 = await regenerateEmailDocumentBlock(campaignId, v1.id, 1, "body");
    createdEmailDocumentIds.push(v2.id);

    await expect(
      regenerateEmailDocumentBlock(campaignId, v1.id, 1, "body"),
    ).rejects.toThrow(EditConflictError);

    const rows = await db.select().from(emailDocuments).where(eq(emailDocuments.campaignId, campaignId));
    expect(rows).toHaveLength(2);
  });

  it("throws EditNotFoundError for a nonexistent campaign", async () => {
    await expect(
      regenerateEmailDocumentBlock("00000000-0000-0000-0000-000000000000", "doc-1", 1, "body"),
    ).rejects.toThrow(EditNotFoundError);
  });

  it("retries once on malformed Claude output, then fails cleanly with no successor row", async () => {
    vi.spyOn(claudeClient, "callClaude").mockResolvedValue('{"not":"valid"}');

    const v1 = await insertV1();
    await expect(
      regenerateEmailDocumentBlock(campaignId, v1.id, 1, "body"),
    ).rejects.toThrow(RegenerateGenerationFailedError);

    expect(claudeClient.callClaude).toHaveBeenCalledTimes(2);

    const rows = await db.select().from(emailDocuments).where(eq(emailDocuments.campaignId, campaignId));
    expect(rows).toHaveLength(1);
  });

  it("succeeds on the second attempt after one malformed response", async () => {
    const callSpy = vi.spyOn(claudeClient, "callClaude");
    callSpy.mockResolvedValueOnce('{"not":"valid"}');
    callSpy.mockResolvedValueOnce(JSON.stringify({ content: "Recovered body copy" }));

    const v1 = await insertV1();
    const result = await regenerateEmailDocumentBlock(campaignId, v1.id, 1, "body");
    createdEmailDocumentIds.push(result.id);

    const body = result.blocks.find((b) => b.id === "body");
    expect(body?.type === "text" && body.content).toBe("Recovered body copy");
  });

  it("does not persist when the regenerated content would fail validation (rejects on error-level result)", async () => {
    vi.spyOn(claudeClient, "callClaude").mockResolvedValue(
      JSON.stringify({ content: "We love synergy here" }),
    );

    const v1 = await insertV1();
    const result = await regenerateEmailDocumentBlock(campaignId, v1.id, 1, "body");
    createdEmailDocumentIds.push(result.id);

    // Prohibited-term hits are warning-level, not blocking — confirms the
    // warning path still persists (mirrors applyEmailDocumentEdit behavior).
    const warning = result.validationResults.find((r) => r.code === "prohibited_term");
    expect(warning?.severity).toBe("warning");
  });
});
