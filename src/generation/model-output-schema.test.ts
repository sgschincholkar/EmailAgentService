import { describe, expect, it } from "vitest";

import { buildModelOutputSchema } from "./model-output-schema";

const validHeroCtaOutput = {
  campaignAngle: "Position the launch as saving time, not adding a tool.",
  subjectLineOptions: ["Subject one", "Subject two", "Subject three"],
  selectedSubjectLine: "Subject one",
  preheader: "A short preview line.",
  blocks: [
    { slotId: "headline", type: "text", content: "Your new home base" },
    { slotId: "body", type: "text", content: "Everything in one place." },
    { slotId: "hero_image", type: "image", altText: "Team collaborating" },
  ],
  assumptions: ["Assumed a friendly tone."],
  missingInputs: [],
  warnings: [],
};

describe("buildModelOutputSchema", () => {
  it("accepts valid output for hero_cta with exactly the required slots", () => {
    const schema = buildModelOutputSchema("hero_cta");
    expect(schema.safeParse(validHeroCtaOutput).success).toBe(true);
  });

  it("requires exactly three subject line options", () => {
    const schema = buildModelOutputSchema("hero_cta");
    const result = schema.safeParse({
      ...validHeroCtaOutput,
      subjectLineOptions: ["Only one"],
    });
    expect(result.success).toBe(false);
  });

  it("requires selectedSubjectLine to be one of subjectLineOptions", () => {
    const schema = buildModelOutputSchema("hero_cta");
    const result = schema.safeParse({
      ...validHeroCtaOutput,
      selectedSubjectLine: "Not in the list",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing required slot for the layout", () => {
    const schema = buildModelOutputSchema("hero_cta");
    const result = schema.safeParse({
      ...validHeroCtaOutput,
      blocks: validHeroCtaOutput.blocks.filter((block) => block.slotId !== "body"),
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown/unexpected slot id for the layout", () => {
    const schema = buildModelOutputSchema("hero_cta");
    const result = schema.safeParse({
      ...validHeroCtaOutput,
      blocks: [
        ...validHeroCtaOutput.blocks,
        { slotId: "offer_details", type: "text", content: "Not allowed here." },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a CTA block from the model — CTA is never model-generated", () => {
    const schema = buildModelOutputSchema("hero_cta");
    const result = schema.safeParse({
      ...validHeroCtaOutput,
      blocks: [
        ...validHeroCtaOutput.blocks,
        { slotId: "cta", type: "text", content: "Buy now" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects HTML-like markup in text content", () => {
    const schema = buildModelOutputSchema("hero_cta");
    const result = schema.safeParse({
      ...validHeroCtaOutput,
      blocks: validHeroCtaOutput.blocks.map((block) =>
        block.slotId === "headline" && block.type === "text"
          ? { ...block, content: "<script>alert(1)</script>" }
          : block,
      ),
    });
    expect(result.success).toBe(false);
  });

  it("accepts ordinary comparison symbols like '20% off' or '<10 min setup'", () => {
    const schema = buildModelOutputSchema("hero_cta");
    const result = schema.safeParse({
      ...validHeroCtaOutput,
      blocks: validHeroCtaOutput.blocks.map((block) =>
        block.slotId === "body" && block.type === "text"
          ? { ...block, content: "Get set up in <10 minutes and save 20% off > standard plans." }
          : block,
      ),
    });
    expect(result.success).toBe(true);
  });

  it("requires the optional hero_image only when explicitly supplied for webinar_event, not otherwise", () => {
    const schema = buildModelOutputSchema("webinar_event");
    const withoutImage = {
      ...validHeroCtaOutput,
      blocks: [
        { slotId: "headline", type: "text", content: "Join the webinar" },
        { slotId: "event_details", type: "text", content: "October 3, 10am ET" },
        { slotId: "body", type: "text", content: "Learn what's next." },
      ],
    };
    expect(schema.safeParse(withoutImage).success).toBe(true);
  });

  it("rejects a webinar_event output missing the required event_details slot", () => {
    const schema = buildModelOutputSchema("webinar_event");
    const missingEventDetails = {
      ...validHeroCtaOutput,
      blocks: [
        { slotId: "headline", type: "text", content: "Join the webinar" },
        { slotId: "body", type: "text", content: "Learn what's next." },
      ],
    };
    expect(schema.safeParse(missingEventDetails).success).toBe(false);
  });

  it("rejects a promotion_offer output using event_details instead of offer_details", () => {
    const schema = buildModelOutputSchema("promotion_offer");
    const wrongSlot = {
      ...validHeroCtaOutput,
      blocks: [
        { slotId: "headline", type: "text", content: "20% off" },
        { slotId: "event_details", type: "text", content: "Wrong slot for this layout." },
        { slotId: "body", type: "text", content: "Upgrade today." },
        { slotId: "hero_image", type: "image", altText: "Product preview" },
      ],
    };
    expect(schema.safeParse(wrongSlot).success).toBe(false);
  });
});
