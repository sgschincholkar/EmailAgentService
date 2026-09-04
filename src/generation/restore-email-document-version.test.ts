import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { saveBrandProfile } from "@/app/brand-profiles/actions";
import { saveCampaign, type CampaignFormInput } from "@/app/campaigns/actions";
import { db } from "@/db/client";
import { brandProfiles, campaigns, emailDocuments, segmentCards } from "@/db/schema";
import { CampaignFactsSchema, LayoutIdSchema } from "@/domain/schemas";

import * as claudeClient from "./claude-client";
import { applyEmailDocumentEdit, EditConflictError } from "./apply-email-document-edit";
import { restoreEmailDocumentVersion } from "./restore-email-document-version";

describe("restoreEmailDocumentVersion", () => {
  let brandProfileId: string;
  let campaignId: string;
  const createdCampaignIds: string[] = [];
  const createdSegmentCardIds: string[] = [];
  const createdEmailDocumentIds: string[] = [];

  beforeAll(async () => {
    const profile = await saveBrandProfile({
      name: "Restore Pipeline Test Brand",
      colors: { primary: "#2563EB" },
      emailFontStack: "Arial, Helvetica, sans-serif",
      tone: ["Warm"],
      preferredTerms: [],
      prohibitedTerms: [],
      defaultCtaStyle: "filled",
      defaultFooterHtml: "Restore pipeline test footer",
    });
    brandProfileId = profile.id;

    const input: CampaignFormInput = {
      brandProfileId,
      name: "Restore Pipeline Test Campaign",
      campaignType: "announcement",
      objective: "awareness",
      brief: "Testing the restore pipeline.",
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

  beforeEach(async () => {
    await db.delete(emailDocuments).where(eq(emailDocuments.campaignId, campaignId));
    vi.restoreAllMocks();
  });

  async function insertV1() {
    const [row] = await db
      .insert(emailDocuments)
      .values({
        campaignId,
        kind: "base",
        version: 1,
        layoutId: "text_announcement",
        subject: "v1 subject",
        preheader: "v1 preheader",
        blocks: [
          {
            id: "headline",
            type: "headline",
            content: "v1 headline",
            editable: true,
            lockedForVariants: false,
          },
          {
            id: "body",
            type: "text",
            content: "v1 body",
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
            html: "Restore pipeline test footer",
            editable: false,
            lockedForVariants: true,
          },
        ],
        sourceFacts: [],
        validationResults: [],
        renderedHtml: "<p>stale v1 html</p>",
        plainText: "stale v1 text",
        status: "generated",
      })
      .returning();
    createdEmailDocumentIds.push(row.id);
    return row;
  }

  it("restores v1 as v4 when v3 is latest, leaving v1-v3 unchanged", async () => {
    const v1 = await insertV1();
    const v2 = await applyEmailDocumentEdit(campaignId, {
      baseDocumentId: v1.id,
      expectedVersion: 1,
      edits: [{ target: "document", field: "subject", value: "v2 subject" }],
    });
    createdEmailDocumentIds.push(v2.id);
    const v3 = await applyEmailDocumentEdit(campaignId, {
      baseDocumentId: v2.id,
      expectedVersion: 2,
      edits: [{ target: "document", field: "subject", value: "v3 subject" }],
    });
    createdEmailDocumentIds.push(v3.id);

    const claudeSpy = vi.spyOn(claudeClient, "callClaude");

    const v4 = await restoreEmailDocumentVersion(campaignId, v1.id, 3);
    createdEmailDocumentIds.push(v4.id);

    expect(v4.version).toBe(4);
    expect(v4.parentEmailDocumentId).toBe(v1.id);
    expect(v4.subject).toBe("v1 subject");
    expect(claudeSpy).not.toHaveBeenCalled();

    const rows = await db
      .select()
      .from(emailDocuments)
      .where(eq(emailDocuments.campaignId, campaignId));
    const byVersion = new Map(rows.map((r) => [r.version, r]));
    expect(byVersion.get(1)?.subject).toBe("v1 subject");
    expect(byVersion.get(2)?.subject).toBe("v2 subject");
    expect(byVersion.get(3)?.subject).toBe("v3 subject");
  });

  it("derives fresh rendered HTML and plain text, not the historical stale values", async () => {
    const v1 = await insertV1();
    const v4 = await restoreEmailDocumentVersion(campaignId, v1.id, 1);
    createdEmailDocumentIds.push(v4.id);

    expect(v4.renderedHtml).not.toBe("<p>stale v1 html</p>");
    expect(v4.plainText).not.toBe("stale v1 text");
    expect(v4.renderedHtml).toContain("v1 headline");
  });

  it("reruns and persists validation on the restored version", async () => {
    const v1 = await insertV1();
    const v4 = await restoreEmailDocumentVersion(campaignId, v1.id, 1);
    createdEmailDocumentIds.push(v4.id);

    expect(Array.isArray(v4.validationResults)).toBe(true);
  });

  it("returns a conflict when expectedVersion is stale", async () => {
    const v1 = await insertV1();
    const v2 = await applyEmailDocumentEdit(campaignId, {
      baseDocumentId: v1.id,
      expectedVersion: 1,
      edits: [{ target: "document", field: "subject", value: "v2 subject" }],
    });
    createdEmailDocumentIds.push(v2.id);

    await expect(restoreEmailDocumentVersion(campaignId, v1.id, 1)).rejects.toThrow(
      EditConflictError,
    );

    const rows = await db
      .select()
      .from(emailDocuments)
      .where(eq(emailDocuments.campaignId, campaignId));
    expect(rows).toHaveLength(2);
  });
});
