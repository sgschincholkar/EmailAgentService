import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { saveBrandProfile } from "@/app/brand-profiles/actions";
import { saveCampaign, type CampaignFormInput } from "@/app/campaigns/actions";
import { db } from "@/db/client";
import { brandProfiles, campaigns, emailDocuments, segmentCards } from "@/db/schema";
import { CampaignFactsSchema, LayoutIdSchema } from "@/domain/schemas";

import {
  applyEmailDocumentEdit,
  EditConflictError,
  EditValidationError,
} from "./apply-email-document-edit";
import type { EmailDocumentEditCommand } from "./email-document-edit-schema";

describe("applyEmailDocumentEdit", () => {
  let brandProfileId: string;
  let campaignId: string;
  const createdCampaignIds: string[] = [];
  const createdSegmentCardIds: string[] = [];
  const createdEmailDocumentIds: string[] = [];

  beforeAll(async () => {
    const profile = await saveBrandProfile({
      name: "Edit Pipeline Test Brand",
      colors: { primary: "#2563EB" },
      emailFontStack: "Arial, Helvetica, sans-serif",
      tone: ["Warm"],
      preferredTerms: [],
      prohibitedTerms: ["synergy"],
      defaultCtaStyle: "filled",
      defaultFooterHtml: "Edit pipeline test footer",
    });
    brandProfileId = profile.id;

    const input: CampaignFormInput = {
      brandProfileId,
      name: "Edit Pipeline Test Campaign",
      campaignType: "announcement",
      objective: "awareness",
      brief: "Testing the edit pipeline.",
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
            html: "Edit pipeline test footer",
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
    // Each test starts from a clean single-version state so version-number
    // assertions stay simple; scoped delete only, never the whole table.
    await db.delete(emailDocuments).where(eq(emailDocuments.campaignId, campaignId));
  });

  it("creates v2 from v1 with a valid subject and text-block edit", async () => {
    const v1 = await insertV1();

    const command: EmailDocumentEditCommand = {
      baseDocumentId: v1.id,
      expectedVersion: 1,
      edits: [
        { target: "document", field: "subject", value: "Updated subject" },
        { target: "block", blockId: "body", field: "content", value: "Updated body" },
      ],
    };

    const result = await applyEmailDocumentEdit(campaignId, command);
    createdEmailDocumentIds.push(result.id);

    expect(result.version).toBe(2);
    expect(result.parentEmailDocumentId).toBe(v1.id);
    expect(result.subject).toBe("Updated subject");

    const bodyBlock = result.blocks.find((b) => b.id === "body");
    expect(bodyBlock?.type === "text" && bodyBlock.content).toBe("Updated body");

    const [v1Row] = await db.select().from(emailDocuments).where(eq(emailDocuments.id, v1.id));
    expect(v1Row.subject).toBe("Original subject");
  });

  it("leaves the footer unchanged and locked", async () => {
    const v1 = await insertV1();
    const result = await applyEmailDocumentEdit(campaignId, {
      baseDocumentId: v1.id,
      expectedVersion: 1,
      edits: [{ target: "document", field: "subject", value: "Any subject" }],
    });
    createdEmailDocumentIds.push(result.id);

    const footer = result.blocks.find((b) => b.type === "footer");
    expect(footer).toMatchObject({
      html: "Edit pipeline test footer",
      editable: false,
      lockedForVariants: true,
    });
  });

  it("leaves untouched blocks structurally unchanged", async () => {
    const v1 = await insertV1();
    const result = await applyEmailDocumentEdit(campaignId, {
      baseDocumentId: v1.id,
      expectedVersion: 1,
      edits: [{ target: "document", field: "subject", value: "Any subject" }],
    });
    createdEmailDocumentIds.push(result.id);

    const headline = result.blocks.find((b) => b.id === "headline");
    expect(headline?.type === "headline" && headline.content).toBe("Original headline");
  });

  it("applies a CTA label and href edit and reflects it in fresh rendered HTML", async () => {
    const v1 = await insertV1();
    const result = await applyEmailDocumentEdit(campaignId, {
      baseDocumentId: v1.id,
      expectedVersion: 1,
      edits: [
        { target: "block", blockId: "cta", field: "label", value: "Get started" },
        { target: "block", blockId: "cta", field: "href", value: "https://app.example.com/start" },
      ],
    });
    createdEmailDocumentIds.push(result.id);

    const cta = result.blocks.find((b) => b.id === "cta");
    expect(cta?.type === "button" && cta.label).toBe("Get started");
    expect(cta?.type === "button" && cta.href).toBe("https://app.example.com/start");
    expect(result.renderedHtml).toContain("Get started");
    expect(result.renderedHtml).toContain("https://app.example.com/start");
    expect(result.plainText).toContain("Get started");
  });

  it("produces nonempty rendered HTML and plain text from the real renderer", async () => {
    const v1 = await insertV1();
    const result = await applyEmailDocumentEdit(campaignId, {
      baseDocumentId: v1.id,
      expectedVersion: 1,
      edits: [{ target: "document", field: "preheader", value: "Fresh preheader" }],
    });
    createdEmailDocumentIds.push(result.id);

    expect(result.renderedHtml).toBeTruthy();
    expect(result.plainText).toBeTruthy();
    expect(result.renderedHtml).not.toBe("<p>Original</p>");
  });

  it("stores fresh validation results on the successor", async () => {
    const v1 = await insertV1();
    const result = await applyEmailDocumentEdit(campaignId, {
      baseDocumentId: v1.id,
      expectedVersion: 1,
      edits: [{ target: "document", field: "subject", value: "Any subject" }],
    });
    createdEmailDocumentIds.push(result.id);

    expect(Array.isArray(result.validationResults)).toBe(true);
  });

  it("does not block saving on a warning-level result (prohibited term)", async () => {
    const v1 = await insertV1();
    const result = await applyEmailDocumentEdit(campaignId, {
      baseDocumentId: v1.id,
      expectedVersion: 1,
      edits: [
        { target: "block", blockId: "body", field: "content", value: "We love synergy here" },
      ],
    });
    createdEmailDocumentIds.push(result.id);

    expect(result.version).toBe(2);
    const warning = result.validationResults.find((r) => r.code === "prohibited_term");
    expect(warning?.severity).toBe("warning");
  });

  it("rejects an unsafe CTA URL and creates no successor row", async () => {
    const v1 = await insertV1();

    await expect(
      applyEmailDocumentEdit(campaignId, {
        baseDocumentId: v1.id,
        expectedVersion: 1,
        edits: [{ target: "block", blockId: "cta", field: "href", value: "javascript:alert(1)" }],
      }),
    ).rejects.toThrow(EditValidationError);

    const rows = await db.select().from(emailDocuments).where(eq(emailDocuments.campaignId, campaignId));
    expect(rows).toHaveLength(1);
  });

  it("rejects editing the footer block and creates no successor row", async () => {
    const v1 = await insertV1();

    await expect(
      applyEmailDocumentEdit(campaignId, {
        baseDocumentId: v1.id,
        expectedVersion: 1,
        edits: [{ target: "block", blockId: "footer" as never, field: "content", value: "x" } as never],
      }),
    ).rejects.toThrow();

    const rows = await db.select().from(emailDocuments).where(eq(emailDocuments.campaignId, campaignId));
    expect(rows).toHaveLength(1);
  });

  it("rejects an edit targeting a block that doesn't exist on the base document", async () => {
    const v1 = await insertV1();

    await expect(
      applyEmailDocumentEdit(campaignId, {
        baseDocumentId: v1.id,
        expectedVersion: 1,
        edits: [{ target: "block", blockId: "hero_image", field: "altText", value: "x" }],
      }),
    ).rejects.toThrow(EditValidationError);

    const rows = await db.select().from(emailDocuments).where(eq(emailDocuments.campaignId, campaignId));
    expect(rows).toHaveLength(1);
  });

  it("returns a 409-mapped conflict when expectedVersion is stale", async () => {
    const v1 = await insertV1();
    const v2 = await applyEmailDocumentEdit(campaignId, {
      baseDocumentId: v1.id,
      expectedVersion: 1,
      edits: [{ target: "document", field: "subject", value: "v2 subject" }],
    });
    createdEmailDocumentIds.push(v2.id);

    await expect(
      applyEmailDocumentEdit(campaignId, {
        baseDocumentId: v1.id,
        expectedVersion: 1,
        edits: [{ target: "document", field: "subject", value: "stale edit" }],
      }),
    ).rejects.toThrow(EditConflictError);

    const rows = await db.select().from(emailDocuments).where(eq(emailDocuments.campaignId, campaignId));
    expect(rows).toHaveLength(2);
  });

  it("cannot create duplicate version numbers under two near-simultaneous saves", async () => {
    const v1 = await insertV1();

    const attempt = () =>
      applyEmailDocumentEdit(campaignId, {
        baseDocumentId: v1.id,
        expectedVersion: 1,
        edits: [{ target: "document", field: "subject", value: `concurrent-${Math.random()}` }],
      });

    const results = await Promise.allSettled([attempt(), attempt()]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    for (const r of fulfilled) {
      if (r.status === "fulfilled") createdEmailDocumentIds.push(r.value.id);
    }

    const rows = await db
      .select()
      .from(emailDocuments)
      .where(eq(emailDocuments.campaignId, campaignId));
    const versions = rows.map((r) => r.version).sort();
    expect(versions).toEqual([1, 2]);
  });
});
