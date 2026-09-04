import { describe, expect, it } from "vitest";

import {
  AssetSchema,
  BLANK_BRAND_PROFILE_INPUT,
  BrandProfileSchema,
  CampaignSchema,
  EmailDocumentSchema,
  SegmentCardSchema,
} from ".";

const timestamps = {
  createdAt: "2026-09-04T06:00:00.000Z",
  updatedAt: "2026-09-04T06:00:00.000Z",
};

describe("BrandProfileSchema", () => {
  it("keeps a blank profile input invalid until primary color and tone are entered", () => {
    expect(
      BrandProfileSchema.safeParse({
        id: "brand-1",
        ...BLANK_BRAND_PROFILE_INPUT,
        ...timestamps,
      }).success,
    ).toBe(false);
  });

  it("applies all system defaults while preserving optional customer fields", () => {
    const profile = BrandProfileSchema.parse({
      id: "brand-1",
      name: "Northstar Studio",
      colors: { primary: "#285E61" },
      tone: ["Warm", "direct"],
      ...timestamps,
    });

    expect(profile).toMatchObject({
      emailFontStack: "Arial, Helvetica, sans-serif",
      preferredTerms: [],
      prohibitedTerms: [],
      defaultCtaStyle: "filled",
      defaultFooterHtml:
        "You are receiving this email because you subscribed to updates.",
    });
    expect(profile.logoAssetId).toBeUndefined();
    expect(profile.preferredFont).toBeUndefined();
  });

  it.each([
    ["blank name", { name: "   " }],
    ["missing primary color", { colors: {} }],
    ["invalid primary color", { colors: { primary: "blue" } }],
    ["empty tone", { tone: [] }],
  ])("rejects a profile with %s", (_reason, changes) => {
    const result = BrandProfileSchema.safeParse({
      id: "brand-1",
      name: "Northstar Studio",
      colors: { primary: "#285E61" },
      tone: ["Warm"],
      ...timestamps,
      ...changes,
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid optional color values and a custom footer", () => {
    const result = BrandProfileSchema.safeParse({
      id: "brand-1",
      name: "Northstar Studio",
      colors: {
        primary: "#285E61",
        secondary: "#F2C94C",
        accent: "#1A202C",
        background: "#FFFFFF",
        text: "#101828",
      },
      tone: ["Warm"],
      defaultFooterHtml: "<p>Northstar Studio</p>",
      ...timestamps,
    });

    expect(result.success).toBe(true);
  });
});

describe("future shared domain schemas", () => {
  it("accepts a structurally valid campaign with confirmed facts", () => {
    const result = CampaignSchema.safeParse({
      id: "campaign-1",
      brandProfileId: "brand-1",
      name: "Autumn launch",
      campaignType: "feature_launch",
      objective: "clicks",
      brief: "Announce the new workflow.",
      segmentCardId: "segment-1",
      facts: {
        productOrFeatureName: "Northstar Automations",
        offerText: "A launch-week offer",
        priceText: "$49",
        discountText: "20% off",
        eligibilityText: "New customers only",
        startDateText: "September 4, 2026",
        endDateText: "September 11, 2026",
        eventDateText: "September 8, 2026",
        eventTimeText: "10:00 AM ET",
        speakerText: "Avery Chen",
        ctaLabel: "Explore the launch",
        ctaUrl: "https://northstar.example/launch",
        requiredClaims: ["Available today"],
        requiredTerms: [],
        prohibitedClaims: [],
      },
      selectedLayoutId: "hero_cta",
      assetIds: ["asset-1"],
      status: "draft",
      ...timestamps,
    });

    expect(result.success).toBe(true);
  });

  it("rejects campaign facts without a non-empty CTA or with an invalid CTA URL", () => {
    const result = CampaignSchema.safeParse({
      id: "campaign-1",
      brandProfileId: "brand-1",
      name: "Autumn launch",
      campaignType: "feature_launch",
      objective: "clicks",
      brief: "Announce the new workflow.",
      segmentCardId: "segment-1",
      facts: {
        ctaLabel: " ",
        ctaUrl: "not-a-url",
        requiredClaims: [],
        requiredTerms: [],
        prohibitedClaims: [],
      },
      selectedLayoutId: "hero_cta",
      assetIds: [],
      status: "draft",
      ...timestamps,
    });

    expect(result.success).toBe(false);
  });

  it("accepts a structured segment card and asset metadata", () => {
    expect(
      SegmentCardSchema.safeParse({
        id: "segment-1",
        name: "Active product teams",
        primaryMotivation: "Move campaigns faster",
        primaryObjection: "Worried output will feel generic",
        desiredAction: "Start a campaign draft",
        messagingNotes: "Favor practical examples.",
        ...timestamps,
      }).success,
    ).toBe(true);

    expect(
      AssetSchema.safeParse({
        id: "asset-1",
        type: "campaign_image",
        filename: "hero.png",
        sizeBytes: 84021,
        storageKey: "campaigns/campaign-1/hero.png",
        publicUrl: "https://assets.example/hero.png",
        mimeType: "image/png",
        width: 1200,
        height: 630,
        altText: "Product dashboard preview",
        createdAt: timestamps.createdAt,
      }).success,
    ).toBe(true);
  });

  it("accepts an EmailDocument with typed blocks and an immutable footer", () => {
    const result = EmailDocumentSchema.safeParse({
      id: "email-1",
      campaignId: "campaign-1",
      kind: "base",
      version: 1,
      subject: "Meet Northstar Automations",
      preheader: "A faster way to launch campaigns.",
      layoutId: "hero_cta",
      blocks: [
        {
          id: "headline",
          type: "headline",
          content: "Campaigns, ready sooner.",
          editable: true,
          lockedForVariants: false,
        },
        {
          id: "hero",
          type: "image",
          assetId: "asset-1",
          altText: "Product dashboard preview",
          editable: true,
          lockedForVariants: false,
        },
        {
          id: "cta",
          type: "button",
          label: "Explore the launch",
          href: "https://northstar.example/launch",
          editable: true,
          lockedForVariants: false,
        },
        {
          id: "footer",
          type: "footer",
          html: "<p>You are receiving this email because you subscribed.</p>",
          editable: false,
          lockedForVariants: true,
        },
      ],
      sourceFacts: [
        {
          id: "fact-1",
          category: "product",
          value: "Northstar Automations",
          sourceType: "campaign_fact",
          sourceReference: "facts.productOrFeatureName",
          approvedForUse: true,
        },
      ],
      validationResults: [
        {
          id: "validation-1",
          severity: "warning",
          code: "missing_alt_text",
          message: "Review image alt text.",
          blockId: "hero",
          suggestedAction: "Add descriptive alt text.",
          createdAt: timestamps.createdAt,
        },
      ],
      renderedHtml: "<html><body>Preview</body></html>",
      plainText: "Preview",
      pdfAssetId: "asset-export-1",
      status: "needs_review",
      ...timestamps,
    });

    expect(result.success).toBe(true);
  });

  it("rejects a footer that can be edited or unlocked for variants", () => {
    const result = EmailDocumentSchema.safeParse({
      id: "email-1",
      campaignId: "campaign-1",
      kind: "base",
      version: 1,
      subject: "Meet Northstar Automations",
      preheader: "A faster way to launch campaigns.",
      layoutId: "hero_cta",
      blocks: [
        {
          id: "footer",
          type: "footer",
          html: "<p>Footer</p>",
          editable: true,
          lockedForVariants: false,
        },
      ],
      sourceFacts: [],
      validationResults: [],
      status: "draft",
      ...timestamps,
    });

    expect(result.success).toBe(false);
  });
});
