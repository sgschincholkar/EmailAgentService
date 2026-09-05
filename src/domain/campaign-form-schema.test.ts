import { describe, expect, it } from "vitest";

import { CampaignFormInputSchema } from "./campaign-form-schema";

function buildCandidate(messagingNotes: string | undefined) {
  return {
    brandProfileId: "brand-1",
    name: "Test campaign",
    campaignType: "announcement",
    objective: "awareness",
    brief: "Test brief",
    facts: {
      ctaLabel: "Learn more",
      ctaUrl: "https://example.com",
      requiredClaims: [],
      requiredTerms: [],
      prohibitedClaims: [],
    },
    selectedLayoutId: "text_announcement",
    images: [],
    segmentCard: {
      name: "Test segment",
      primaryMotivation: "Curiosity",
      primaryObjection: "No time",
      desiredAction: "Click through",
      messagingNotes,
    },
  };
}

describe("CampaignFormInputSchema — optional segment messaging notes", () => {
  it("accepts undefined messaging notes", () => {
    const result = CampaignFormInputSchema.safeParse(buildCandidate(undefined));
    expect(result.success).toBe(true);
  });

  it("accepts an empty string for messaging notes", () => {
    const result = CampaignFormInputSchema.safeParse(buildCandidate(""));
    expect(result.success).toBe(true);
  });

  it("accepts non-empty messaging notes", () => {
    const result = CampaignFormInputSchema.safeParse(buildCandidate("Keep it casual."));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.segmentCard.messagingNotes).toBe("Keep it casual.");
    }
  });

  it("still rejects a missing required segment field", () => {
    const candidate = buildCandidate(undefined);
    // @ts-expect-error deliberately invalid for this test
    delete candidate.segmentCard.name;
    const result = CampaignFormInputSchema.safeParse(candidate);
    expect(result.success).toBe(false);
  });
});
