import type {
  Asset,
  BrandProfile,
  Campaign,
  EmailBlock,
  EmailDocument,
  FooterEmailBlock,
  ImageEmailBlock,
  TextEmailBlock,
} from "@/domain/schemas";
import { resolveFooter } from "@/renderer/resolve-footer";

import { buildSourceFacts } from "./build-source-facts";
import type { ModelOutput } from "./model-output-schema";

/**
 * Block IDs equal the slot ID directly (deterministic, not a random UUID)
 * — the renderer's slot lookups (src/renderer/slots.ts, unchanged from
 * Slice 2) find blocks by exact `block.id === slotId` match, so the block
 * ID cannot carry a layoutId prefix without breaking that lookup.
 */
function buildCtaBlock(campaign: Campaign): EmailBlock {
  return {
    id: "cta",
    type: "button",
    label: campaign.facts.ctaLabel,
    href: campaign.facts.ctaUrl,
    editable: true,
    lockedForVariants: false,
  };
}

function buildImageBlock(
  slotId: string,
  assetId: string,
  altText: string,
): ImageEmailBlock {
  return {
    id: slotId,
    type: "image",
    assetId,
    altText,
    editable: true,
    lockedForVariants: false,
  };
}

function buildTextBlock(
  slotId: string,
  type: TextEmailBlock["type"],
  content: string,
): TextEmailBlock {
  return {
    id: slotId,
    type,
    content,
    editable: true,
    lockedForVariants: false,
  };
}

const HEADLINE_SLOT_TYPE: TextEmailBlock["type"] = "headline";

/**
 * Builds the in-memory EmailDocument from validated model output plus
 * system-owned data. CTA and footer are never taken from the model —
 * built deterministically from CampaignFacts and the BrandProfile footer
 * precedence rule (resolveFooter, unchanged from Slice 2).
 */
export function buildEmailDocument(params: {
  campaign: Campaign;
  brandProfile: BrandProfile;
  images: Asset[];
  modelOutput: ModelOutput;
}): EmailDocument {
  const { campaign, brandProfile, images, modelOutput } = params;
  const now = new Date().toISOString();

  const blocks: EmailBlock[] = [];

  for (const modelBlock of modelOutput.blocks) {
    if (modelBlock.type === "text") {
      const type: TextEmailBlock["type"] =
        modelBlock.slotId === "headline" ? HEADLINE_SLOT_TYPE : "text";
      blocks.push(buildTextBlock(modelBlock.slotId, type, modelBlock.content));
    } else if (modelBlock.type === "image") {
      const asset = images[0];
      if (asset) {
        blocks.push(buildImageBlock(modelBlock.slotId, asset.id, modelBlock.altText));
      }
    }
  }

  blocks.push(buildCtaBlock(campaign));

  const footer: FooterEmailBlock = resolveFooter(blocks, brandProfile);
  blocks.push(footer);

  return {
    id: crypto.randomUUID(),
    campaignId: campaign.id,
    kind: "base",
    version: 1,
    layoutId: campaign.selectedLayoutId,
    subject: modelOutput.selectedSubjectLine,
    preheader: modelOutput.preheader,
    blocks,
    sourceFacts: buildSourceFacts(campaign.facts),
    validationResults: [],
    status: "generated",
    createdAt: now,
    updatedAt: now,
  };
}
