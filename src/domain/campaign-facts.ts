import type { CampaignType, LayoutId } from "@/domain/schemas";

export const LAYOUT_LABELS: Record<LayoutId, string> = {
  hero_cta: "Visual spotlight",
  webinar_event: "Event invitation",
  text_announcement: "Simple announcement",
  promotion_offer: "Offer highlight",
};

export const LAYOUT_OPTIONS: { id: LayoutId; label: string }[] = (
  Object.entries(LAYOUT_LABELS) as [LayoutId, string][]
).map(([id, label]) => ({ id, label }));

/** Campaign-fact keys tied to a specific campaign type's conditional section. */
const TYPE_SPECIFIC_FACT_KEYS = {
  feature_launch: ["productOrFeatureName"],
  announcement: ["productOrFeatureName"],
  promotion: ["offerText", "priceText", "discountText"],
  webinar: ["eventDateText", "eventTimeText", "speakerText"],
  newsletter: [],
  activation: [],
  reactivation: [],
} as const satisfies Record<CampaignType, readonly string[]>;

export function typeSpecificFactKeys(type: CampaignType): readonly string[] {
  return TYPE_SPECIFIC_FACT_KEYS[type];
}

/**
 * Fact keys that would be discarded moving from `fromType` to `toType`,
 * given which keys currently hold a populated value. Used to gate the
 * type-change confirmation prompt.
 */
export function incompatibleFactKeysOnTypeChange(
  fromType: CampaignType,
  toType: CampaignType,
  populatedKeys: readonly string[],
): string[] {
  if (fromType === toType) return [];
  const nextKeys = new Set(typeSpecificFactKeys(toType));
  const previousKeys = typeSpecificFactKeys(fromType);
  return previousKeys.filter(
    (key) => !nextKeys.has(key) && populatedKeys.includes(key),
  );
}
