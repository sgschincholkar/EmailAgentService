import type { Campaign } from "@/domain/schemas";
import { LAYOUT_SLOTS } from "@/renderer/layout-slots";

export class PreflightError extends Error {}

/**
 * Blocking checks that must pass before calling Claude at all — CTA
 * label/URL and required-image presence. Missing type-specific
 * CampaignFacts (e.g. event date for a webinar) are warnings elsewhere
 * and do not block generation; these two checks do.
 */
export function runPreflightCheck(params: {
  campaign: Campaign;
  hasImage: boolean;
}): void {
  const { campaign, hasImage } = params;

  if (!campaign.facts.ctaLabel.trim() || !campaign.facts.ctaUrl.trim()) {
    throw new PreflightError(
      "This campaign needs a CTA label and destination URL before generating.",
    );
  }

  const requiredImageSlot = LAYOUT_SLOTS[campaign.selectedLayoutId].find(
    (slot) => slot.kind === "image" && slot.required,
  );
  if (requiredImageSlot && !hasImage) {
    throw new PreflightError(
      "This layout requires at least one campaign image before generating.",
    );
  }
}
