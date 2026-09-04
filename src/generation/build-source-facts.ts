import type { CampaignFacts, SourceFact } from "@/domain/schemas";

/**
 * SourceFact entries exist only for confirmed, outward-facing facts —
 * CampaignFacts fields the user explicitly confirmed. Model assumptions,
 * missingInputs, and warnings are never converted into SourceFacts; those
 * map into ValidationResult records instead (see run-validations.ts).
 */
export function buildSourceFacts(facts: CampaignFacts): SourceFact[] {
  const entries: { category: string; value: string; reference: string }[] = [];

  if (facts.productOrFeatureName) {
    entries.push({
      category: "product",
      value: facts.productOrFeatureName,
      reference: "facts.productOrFeatureName",
    });
  }
  if (facts.offerText) {
    entries.push({ category: "offer", value: facts.offerText, reference: "facts.offerText" });
  }
  if (facts.priceText) {
    entries.push({ category: "price", value: facts.priceText, reference: "facts.priceText" });
  }
  if (facts.discountText) {
    entries.push({
      category: "discount",
      value: facts.discountText,
      reference: "facts.discountText",
    });
  }
  if (facts.eligibilityText) {
    entries.push({
      category: "eligibility",
      value: facts.eligibilityText,
      reference: "facts.eligibilityText",
    });
  }
  if (facts.startDateText) {
    entries.push({
      category: "start_date",
      value: facts.startDateText,
      reference: "facts.startDateText",
    });
  }
  if (facts.endDateText) {
    entries.push({
      category: "end_date",
      value: facts.endDateText,
      reference: "facts.endDateText",
    });
  }
  if (facts.eventDateText) {
    entries.push({
      category: "event_date",
      value: facts.eventDateText,
      reference: "facts.eventDateText",
    });
  }
  if (facts.eventTimeText) {
    entries.push({
      category: "event_time",
      value: facts.eventTimeText,
      reference: "facts.eventTimeText",
    });
  }
  if (facts.speakerText) {
    entries.push({ category: "speaker", value: facts.speakerText, reference: "facts.speakerText" });
  }
  for (const claim of facts.requiredClaims) {
    entries.push({ category: "required_claim", value: claim, reference: "facts.requiredClaims" });
  }

  return entries.map((entry, index) => ({
    id: `source-fact-${index}`,
    category: entry.category,
    value: entry.value,
    sourceType: "campaign_fact" as const,
    sourceReference: entry.reference,
    approvedForUse: true,
  }));
}
