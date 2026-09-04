import type {
  Asset,
  BrandProfile,
  Campaign,
  LayoutId,
  SegmentCard,
} from "@/domain/schemas";
import { LAYOUT_SLOTS, type SlotKind } from "@/renderer/layout-slots";

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

export type RegenerateBlockInput = GenerationInput & {
  blockId: string;
  blockKind: SlotKind;
  currentValue: string;
};

/**
 * Assembles the user prompt for a targeted single-block regeneration.
 * Reuses the same brand/campaign/segment context as the full-document
 * prompt but asks for exactly one field back, so an existing narrow output
 * schema can validate it. The current content of the target block is
 * included so Claude produces a genuine alternative, not a copy.
 */
export function buildRegenerateBlockPrompt(input: RegenerateBlockInput): string {
  const { brandProfile, campaign, segmentCard, images, blockId, blockKind, currentValue } = input;
  const layoutId: LayoutId = campaign.selectedLayoutId;
  const slot = LAYOUT_SLOTS[layoutId].find((candidate) => candidate.slotId === blockId);

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
    targetSlot: { slotId: blockId, type: blockKind, required: slot?.required ?? false },
    currentValue,
    images: images.map((asset) => ({
      slotId: "hero_image",
      existingAltText: asset.altText,
      width: asset.width,
      height: asset.height,
    })),
  };

  const outputShapeExample =
    blockKind === "image"
      ? { altText: "A fresh, descriptive alt text for the existing image." }
      : { content: "Fresh alternative copy for this one slot." };

  return `Regenerate ONE alternative for a single slot in an existing email. Do not rewrite any other part of the email — you are only being asked for this one slot's content.

Return a single JSON object with EXACTLY this shape — no other keys:

${JSON.stringify(outputShapeExample, null, 2)}

The slot's current value is given below as "currentValue" for context — produce a genuinely different alternative, not a copy of it.

Input:

${JSON.stringify(payload, null, 2)}`;
}
