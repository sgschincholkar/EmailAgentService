import { describe, expect, it } from "vitest";

import { CampaignFactsSchema } from "@/domain/schemas";

import { buildSourceFacts } from "./build-source-facts";

describe("buildSourceFacts", () => {
  it("creates a SourceFact for each populated confirmed campaign fact", () => {
    const facts = CampaignFactsSchema.parse({
      ctaLabel: "Save my seat",
      ctaUrl: "https://example.com",
      productOrFeatureName: "Shared Workspace",
      offerText: "20% off",
      eventDateText: "October 3, 2026",
      requiredClaims: ["Available today"],
      requiredTerms: [],
      prohibitedClaims: [],
    });

    const sourceFacts = buildSourceFacts(facts);

    expect(sourceFacts.every((fact) => fact.sourceType === "campaign_fact")).toBe(true);
    expect(sourceFacts.every((fact) => fact.approvedForUse === true)).toBe(true);

    const values = sourceFacts.map((fact) => fact.value);
    expect(values).toContain("Shared Workspace");
    expect(values).toContain("20% off");
    expect(values).toContain("October 3, 2026");
    expect(values).toContain("Available today");
  });

  it("produces no entries for unpopulated optional facts", () => {
    const facts = CampaignFactsSchema.parse({
      ctaLabel: "Learn more",
      ctaUrl: "https://example.com",
      requiredClaims: [],
      requiredTerms: [],
      prohibitedClaims: [],
    });

    expect(buildSourceFacts(facts)).toEqual([]);
  });

  it("never includes CTA label or URL as SourceFacts (they are not outward facts to preserve provenance for)", () => {
    const facts = CampaignFactsSchema.parse({
      ctaLabel: "Save my seat",
      ctaUrl: "https://example.com/register",
      requiredClaims: [],
      requiredTerms: [],
      prohibitedClaims: [],
    });

    const values = buildSourceFacts(facts).map((fact) => fact.value);
    expect(values).not.toContain("Save my seat");
    expect(values).not.toContain("https://example.com/register");
  });
});
