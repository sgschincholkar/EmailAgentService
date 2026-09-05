import { describe, expect, it } from "vitest";

import type { BrandProfile, Campaign, EmailBlock, EmailDocument } from "@/domain/schemas";

import { runValidations } from "./run-validations";

const brandProfile: BrandProfile = {
  id: "brand-1",
  name: "Test Brand",
  colors: { primary: "#2563EB" },
  emailFontStack: "Arial, Helvetica, sans-serif",
  tone: ["Warm"],
  preferredTerms: [],
  prohibitedTerms: [],
  defaultCtaStyle: "filled",
  defaultFooterHtml: "Test footer",
  createdAt: "2026-09-05T00:00:00.000Z",
  updatedAt: "2026-09-05T00:00:00.000Z",
};

function buildCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "campaign-1",
    brandProfileId: "brand-1",
    segmentCardId: "segment-1",
    name: "Test Campaign",
    campaignType: "announcement",
    objective: "awareness",
    brief: "Test brief.",
    facts: {
      ctaLabel: "Learn more",
      ctaUrl: "https://example.com",
      requiredClaims: [],
      requiredTerms: [],
      prohibitedClaims: [],
    },
    selectedLayoutId: "text_announcement",
    assetIds: [],
    status: "generated",
    createdAt: "2026-09-05T00:00:00.000Z",
    updatedAt: "2026-09-05T00:00:00.000Z",
    ...overrides,
  };
}

function buildDocument(blocks: EmailBlock[], layoutId: Campaign["selectedLayoutId"] = "text_announcement"): EmailDocument {
  return {
    id: "doc-1",
    campaignId: "campaign-1",
    kind: "base",
    version: 1,
    layoutId,
    subject: "Subject",
    preheader: "Preheader",
    blocks,
    sourceFacts: [],
    validationResults: [],
    status: "generated",
    createdAt: "2026-09-05T00:00:00.000Z",
    updatedAt: "2026-09-05T00:00:00.000Z",
  };
}

const footerBlock: EmailBlock = {
  id: "footer",
  type: "footer",
  html: "Test footer",
  editable: false,
  lockedForVariants: true,
};

const ctaBlock: EmailBlock = {
  id: "cta",
  type: "button",
  label: "Learn more",
  href: "https://example.com",
  editable: true,
  lockedForVariants: false,
};

describe("runValidations — required text/button slot content", () => {
  it("flags a missing required text block as an error", () => {
    const campaign = buildCampaign({ selectedLayoutId: "text_announcement" });
    const document = buildDocument([ctaBlock, footerBlock], "text_announcement");

    const results = runValidations({ campaign, brandProfile, document, hasImage: false });

    const headlineError = results.find(
      (r) => r.severity === "error" && r.blockId === "headline",
    );
    const bodyError = results.find((r) => r.severity === "error" && r.blockId === "body");
    expect(headlineError).toBeTruthy();
    expect(bodyError).toBeTruthy();
  });

  it("flags a required text block with empty/whitespace-only content as an error", () => {
    const campaign = buildCampaign({ selectedLayoutId: "text_announcement" });
    const document = buildDocument(
      [
        { id: "headline", type: "headline", content: "   ", editable: true, lockedForVariants: false },
        { id: "body", type: "text", content: "Real body copy", editable: true, lockedForVariants: false },
        ctaBlock,
        footerBlock,
      ],
      "text_announcement",
    );

    const results = runValidations({ campaign, brandProfile, document, hasImage: false });

    const headlineError = results.find(
      (r) => r.severity === "error" && r.blockId === "headline",
    );
    const bodyError = results.find((r) => r.severity === "error" && r.blockId === "body");
    expect(headlineError).toBeTruthy();
    expect(bodyError).toBeUndefined();
  });

  it("does not flag anything when every required non-image slot has content", () => {
    const campaign = buildCampaign({ selectedLayoutId: "text_announcement" });
    const document = buildDocument(
      [
        { id: "headline", type: "headline", content: "A real headline", editable: true, lockedForVariants: false },
        { id: "body", type: "text", content: "Real body copy", editable: true, lockedForVariants: false },
        ctaBlock,
        footerBlock,
      ],
      "text_announcement",
    );

    const results = runValidations({ campaign, brandProfile, document, hasImage: false });

    expect(results.filter((r) => r.severity === "error")).toHaveLength(0);
  });

  it("flags a missing event_details block for webinar_event but not offer_details", () => {
    const campaign = buildCampaign({ selectedLayoutId: "webinar_event" });
    const document = buildDocument(
      [
        { id: "headline", type: "headline", content: "Join us", editable: true, lockedForVariants: false },
        { id: "body", type: "text", content: "Come to our webinar", editable: true, lockedForVariants: false },
        ctaBlock,
        footerBlock,
      ],
      "webinar_event",
    );

    const results = runValidations({ campaign, brandProfile, document, hasImage: false });

    const eventDetailsError = results.find(
      (r) => r.severity === "error" && r.blockId === "event_details",
    );
    expect(eventDetailsError).toBeTruthy();
  });

  it("does not require event_details or offer_details for text_announcement", () => {
    const campaign = buildCampaign({ selectedLayoutId: "text_announcement" });
    const document = buildDocument(
      [
        { id: "headline", type: "headline", content: "A real headline", editable: true, lockedForVariants: false },
        { id: "body", type: "text", content: "Real body copy", editable: true, lockedForVariants: false },
        ctaBlock,
        footerBlock,
      ],
      "text_announcement",
    );

    const results = runValidations({ campaign, brandProfile, document, hasImage: false });

    expect(results.some((r) => r.blockId === "event_details")).toBe(false);
    expect(results.some((r) => r.blockId === "offer_details")).toBe(false);
  });
});
