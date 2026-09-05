import { describe, expect, it } from "vitest";

import type { EmailBlock, LayoutId } from "@/domain/schemas";

import { mapBlocksToLayout } from "./layout-block-mapper";

const heroImageBlock: EmailBlock = {
  id: "hero_image",
  type: "image",
  assetId: "asset-1",
  altText: "A hero image",
  editable: true,
  lockedForVariants: false,
};
const headlineBlock: EmailBlock = {
  id: "headline",
  type: "headline",
  content: "A headline",
  editable: true,
  lockedForVariants: false,
};
const bodyBlock: EmailBlock = {
  id: "body",
  type: "text",
  content: "Body copy",
  editable: true,
  lockedForVariants: false,
};
const eventDetailsBlock: EmailBlock = {
  id: "event_details",
  type: "text",
  content: "October 3 at 10am",
  editable: true,
  lockedForVariants: false,
};
const offerDetailsBlock: EmailBlock = {
  id: "offer_details",
  type: "text",
  content: "20% off",
  editable: true,
  lockedForVariants: false,
};
const ctaBlock: EmailBlock = {
  id: "cta",
  type: "button",
  label: "Learn more",
  href: "https://example.com",
  editable: true,
  lockedForVariants: false,
};
const footerBlock: EmailBlock = {
  id: "footer",
  type: "footer",
  html: "Footer html",
  editable: false,
  lockedForVariants: true,
};

const ALL_LAYOUTS: LayoutId[] = ["hero_cta", "webinar_event", "text_announcement", "promotion_offer"];

const FULL_BLOCK_SET_BY_LAYOUT: Record<LayoutId, EmailBlock[]> = {
  hero_cta: [heroImageBlock, headlineBlock, bodyBlock, ctaBlock, footerBlock],
  webinar_event: [headlineBlock, eventDetailsBlock, bodyBlock, ctaBlock, heroImageBlock, footerBlock],
  text_announcement: [headlineBlock, bodyBlock, ctaBlock, footerBlock],
  promotion_offer: [heroImageBlock, headlineBlock, offerDetailsBlock, bodyBlock, ctaBlock, footerBlock],
};

describe("mapBlocksToLayout", () => {
  it("always carries footer over unchanged, regardless of transition", () => {
    for (const source of ALL_LAYOUTS) {
      for (const target of ALL_LAYOUTS) {
        const result = mapBlocksToLayout(FULL_BLOCK_SET_BY_LAYOUT[source], target);
        const footer = result.blocks.find((b) => b.id === "footer");
        expect(footer).toEqual(footerBlock);
      }
    }
  });

  it("always carries headline, body, and cta across every transition", () => {
    for (const source of ALL_LAYOUTS) {
      for (const target of ALL_LAYOUTS) {
        const result = mapBlocksToLayout(FULL_BLOCK_SET_BY_LAYOUT[source], target);
        expect(result.kept).toEqual(expect.arrayContaining(["headline", "body", "cta"]));
      }
    }
  });

  it("carries hero_image only into layouts that have a hero_image slot", () => {
    const fromHeroCta = mapBlocksToLayout(FULL_BLOCK_SET_BY_LAYOUT.hero_cta, "text_announcement");
    expect(fromHeroCta.kept).not.toContain("hero_image");
    expect(fromHeroCta.removed).toContain("hero_image");

    const toWebinar = mapBlocksToLayout(FULL_BLOCK_SET_BY_LAYOUT.hero_cta, "webinar_event");
    expect(toWebinar.kept).toContain("hero_image");

    const toPromotion = mapBlocksToLayout(FULL_BLOCK_SET_BY_LAYOUT.hero_cta, "promotion_offer");
    expect(toPromotion.kept).toContain("hero_image");
  });

  it("drops event_details when switching away from webinar_event", () => {
    const result = mapBlocksToLayout(FULL_BLOCK_SET_BY_LAYOUT.webinar_event, "text_announcement");
    expect(result.removed).toContain("event_details");
    expect(result.blocks.some((b) => b.id === "event_details")).toBe(false);
  });

  it("drops offer_details when switching away from promotion_offer", () => {
    const result = mapBlocksToLayout(FULL_BLOCK_SET_BY_LAYOUT.promotion_offer, "hero_cta");
    expect(result.removed).toContain("offer_details");
    expect(result.blocks.some((b) => b.id === "offer_details")).toBe(false);
  });

  it("never carries event_details into promotion_offer or offer_details into webinar_event", () => {
    const eventIntoOffer = mapBlocksToLayout(FULL_BLOCK_SET_BY_LAYOUT.webinar_event, "promotion_offer");
    expect(eventIntoOffer.blocks.some((b) => b.id === "event_details")).toBe(false);
    expect(eventIntoOffer.kept).not.toContain("event_details");

    const offerIntoEvent = mapBlocksToLayout(FULL_BLOCK_SET_BY_LAYOUT.promotion_offer, "webinar_event");
    expect(offerIntoEvent.blocks.some((b) => b.id === "offer_details")).toBe(false);
    expect(offerIntoEvent.kept).not.toContain("offer_details");
  });

  it("reports missingRequired when the target needs a slot the source has no content for", () => {
    const result = mapBlocksToLayout(FULL_BLOCK_SET_BY_LAYOUT.text_announcement, "promotion_offer");
    expect(result.missingRequired).toContain("offer_details");
    expect(result.missingRequired).toContain("hero_image");
  });

  it("reports no missingRequired when every required target slot is satisfied", () => {
    const result = mapBlocksToLayout(FULL_BLOCK_SET_BY_LAYOUT.promotion_offer, "hero_cta");
    expect(result.missingRequired).toHaveLength(0);
  });

  it("never invents content — a dropped block's content never reappears under a different id", () => {
    const result = mapBlocksToLayout(FULL_BLOCK_SET_BY_LAYOUT.promotion_offer, "webinar_event");
    const bodyResult = result.blocks.find((b) => b.id === "body");
    expect(bodyResult?.type === "text" && bodyResult.content).toBe("Body copy");
    expect(result.blocks.find((b) => b.id === "event_details")).toBeUndefined();
  });

  it.each(
    ALL_LAYOUTS.flatMap((source) => ALL_LAYOUTS.map((target) => [source, target] as const)),
  )("does not throw for %s -> %s", (source, target) => {
    expect(() => mapBlocksToLayout(FULL_BLOCK_SET_BY_LAYOUT[source], target)).not.toThrow();
  });
});
