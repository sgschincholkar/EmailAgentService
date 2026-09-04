import type {
  Asset,
  BrandProfile,
  Campaign,
  LayoutId,
  SegmentCard,
} from "@/domain/schemas";
import { LAYOUT_SLOTS } from "@/renderer/layout-slots";

export type GenerationInput = {
  brandProfile: BrandProfile;
  campaign: Campaign;
  segmentCard: SegmentCard;
  images: Asset[];
};

/**
 * Assembles the user prompt: a structured data dump of everything the
 * model is allowed to see and use, plus the layout's available (non-CTA,
 * non-footer) slots so the model knows exactly what it may fill in.
 */
export function buildUserPrompt(input: GenerationInput): string {
  const { brandProfile, campaign, segmentCard, images } = input;
  const layoutId: LayoutId = campaign.selectedLayoutId;
  const modelSlots = LAYOUT_SLOTS[layoutId].filter((slot) => slot.kind !== "button");

  const payload = {
    brandProfile: {
      name: brandProfile.name,
      colors: brandProfile.colors,
      tone: brandProfile.tone,
      voiceNotes: brandProfile.voiceNotes,
      preferredTerms: brandProfile.preferredTerms,
      prohibitedTerms: brandProfile.prohibitedTerms,
    },
    campaign: {
      type: campaign.campaignType,
      objective: campaign.objective,
      brief: campaign.brief,
    },
    facts: campaign.facts,
    segment: {
      name: segmentCard.name,
      lifecycleStage: segmentCard.lifecycleStage,
      primaryMotivation: segmentCard.primaryMotivation,
      primaryObjection: segmentCard.primaryObjection,
      desiredAction: segmentCard.desiredAction,
      messagingNotes: segmentCard.messagingNotes,
    },
    layoutId,
    availableSlots: modelSlots.map((slot) => ({
      slotId: slot.slotId,
      type: slot.kind,
      required: slot.required,
    })),
    images: images.map((asset) => ({
      slotId: "hero_image",
      existingAltText: asset.altText,
      width: asset.width,
      height: asset.height,
    })),
  };

  const exampleTextSlot = modelSlots.find((slot) => slot.kind === "text");
  const exampleImageSlot = modelSlots.find((slot) => slot.kind === "image");
  const exampleBlocks: unknown[] = [];
  if (exampleTextSlot) {
    exampleBlocks.push({
      slotId: exampleTextSlot.slotId,
      type: "text",
      content: "Example copy for this slot.",
    });
  }
  if (exampleImageSlot) {
    exampleBlocks.push({
      slotId: exampleImageSlot.slotId,
      type: "image",
      altText: "Example descriptive alt text for this image.",
    });
  }

  const outputShapeExample = {
    campaignAngle: "One sentence describing the persuasive angle you're taking.",
    subjectLineOptions: ["Subject option one", "Subject option two", "Subject option three"],
    selectedSubjectLine: "Subject option one",
    preheader: "A short preview line shown next to the subject.",
    blocks: exampleBlocks,
    assumptions: [],
    missingInputs: [],
    warnings: [],
  };

  return `Generate campaign copy for the following input.

Return a single JSON object with EXACTLY this top-level shape — the same keys, same nesting, "blocks" as an array of {slotId, type, content|altText} objects. Do not return a flat object keyed by slotId. Do not omit any of these top-level keys, even when a list is empty.

${JSON.stringify(outputShapeExample, null, 2)}

Input:

${JSON.stringify(payload, null, 2)}`;
}
