import { describe, expect, it } from "vitest";

import { CampaignFactsSchema, type Asset, type BrandProfile, type Campaign } from "@/domain/schemas";

import { buildEmailDocument } from "./build-email-document";
import type { ModelOutput } from "./model-output-schema";

const brandProfile: BrandProfile = {
  id: "brand-1",
  name: "Northstar Studio",
  colors: { primary: "#2563EB" },
  emailFontStack: "Arial, Helvetica, sans-serif",
  tone: ["Warm"],
  preferredTerms: [],
  prohibitedTerms: [],
  defaultCtaStyle: "filled",
  defaultFooterHtml: "Northstar Studio footer",
  createdAt: "2026-09-04T06:00:00.000Z",
  updatedAt: "2026-09-04T06:00:00.000Z",
};

const campaign: Campaign = {
  id: "campaign-1",
  brandProfileId: "brand-1",
  segmentCardId: "segment-1",
  name: "Autumn launch",
  campaignType: "feature_launch",
  objective: "activation",
  brief: "Announce the launch.",
  facts: CampaignFactsSchema.parse({
    ctaLabel: "Try it now",
    ctaUrl: "https://app.example.com/try",
    requiredClaims: [],
    requiredTerms: [],
    prohibitedClaims: [],
  }),
  selectedLayoutId: "hero_cta",
  assetIds: ["asset-1"],
  status: "generating",
  createdAt: "2026-09-04T06:00:00.000Z",
  updatedAt: "2026-09-04T06:00:00.000Z",
};

const images: Asset[] = [
  {
    id: "asset-1",
    type: "campaign_image",
    filename: "hero.png",
    mimeType: "image/png",
    sizeBytes: 100,
    storageKey: "hero-key.png",
    width: 600,
    height: 300,
    createdAt: "2026-09-04T06:00:00.000Z",
  },
];

const modelOutput: ModelOutput = {
  campaignAngle: "Focus on speed.",
  subjectLineOptions: ["Subject A", "Subject B", "Subject C"],
  selectedSubjectLine: "Subject A",
  preheader: "A short preview.",
  blocks: [
    { slotId: "headline", type: "text", content: "Your new home base" },
    { slotId: "body", type: "text", content: "Everything in one place." },
    { slotId: "hero_image", type: "image", altText: "Team collaborating" },
  ],
  assumptions: [],
  missingInputs: [],
  warnings: [],
};

describe("buildEmailDocument", () => {
  it("uses deterministic slot-derived block IDs, not random UUIDs", () => {
    const document = buildEmailDocument({ campaign, brandProfile, images, modelOutput });

    const headline = document.blocks.find((block) => block.type === "headline");
    const body = document.blocks.find((block) => block.id === "body");
    const cta = document.blocks.find((block) => block.type === "button");
    const image = document.blocks.find((block) => block.type === "image");

    // Block IDs equal the slot ID directly (not prefixed with layoutId) —
    // the renderer's slot lookups (src/renderer/slots.ts, Slice 2) find
    // blocks by exact `block.id === slotId` match.
    expect(headline?.id).toBe("headline");
    expect(body?.id).toBe("body");
    expect(cta?.id).toBe("cta");
    expect(image?.id).toBe("hero_image");
  });

  it("builds the CTA block from CampaignFacts, never from model output", () => {
    const document = buildEmailDocument({ campaign, brandProfile, images, modelOutput });
    const cta = document.blocks.find((block) => block.type === "button");

    expect(cta).toMatchObject({
      label: "Try it now",
      href: "https://app.example.com/try",
    });
  });

  it("builds the footer from BrandProfile via the existing footer-precedence rule, not from model output", () => {
    const document = buildEmailDocument({ campaign, brandProfile, images, modelOutput });
    const footer = document.blocks.find((block) => block.type === "footer");

    expect(footer).toMatchObject({
      html: "Northstar Studio footer",
      editable: false,
      lockedForVariants: true,
    });
  });

  it("uses subjects and preheader from model output", () => {
    const document = buildEmailDocument({ campaign, brandProfile, images, modelOutput });
    expect(document.subject).toBe("Subject A");
    expect(document.preheader).toBe("A short preview.");
  });

  it("is version 1 with sourceFacts derived only from CampaignFacts", () => {
    const document = buildEmailDocument({ campaign, brandProfile, images, modelOutput });
    expect(document.version).toBe(1);
    expect(document.sourceFacts.every((fact) => fact.sourceType === "campaign_fact")).toBe(
      true,
    );
  });

  it("resolves the image block to the real asset id, not a model-supplied value", () => {
    const document = buildEmailDocument({ campaign, brandProfile, images, modelOutput });
    const image = document.blocks.find((block) => block.type === "image");
    expect(image).toMatchObject({ assetId: "asset-1", altText: "Team collaborating" });
  });
});
