import type {
  BrandProfile,
  Campaign,
  EmailDocument,
  ValidationResult,
} from "@/domain/schemas";
import { LAYOUT_SLOTS } from "@/renderer/layout-slots";

import type { ModelOutput } from "./model-output-schema";

let counter = 0;
function nextValidationId(): string {
  counter += 1;
  return `validation-${counter}`;
}

function result(
  severity: ValidationResult["severity"],
  code: ValidationResult["code"],
  message: string,
  extra?: { blockId?: string; suggestedAction?: string },
): ValidationResult {
  return {
    id: nextValidationId(),
    severity,
    code,
    message,
    blockId: extra?.blockId,
    suggestedAction: extra?.suggestedAction,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Pre-render validation: facts/claims, CTA, prohibited terms, required
 * image presence, required layout blocks, plus meaningful model
 * missingInputs/warnings carried through as ValidationResult entries (not
 * as SourceFacts — see build-source-facts.ts).
 */
export function runValidations(params: {
  campaign: Campaign;
  brandProfile: BrandProfile;
  document: EmailDocument;
  /**
   * Only present for a fresh Claude generation. Manual edit/restore paths
   * (Slice 6A) have no new model output, so the missingInputs/warnings
   * echo below is skipped for them — every other check (CTA, image,
   * footer, prohibited-term) runs identically either way.
   */
  modelOutput?: ModelOutput;
  hasImage: boolean;
}): ValidationResult[] {
  const { campaign, brandProfile, document, modelOutput, hasImage } = params;
  const results: ValidationResult[] = [];

  if (!campaign.facts.ctaLabel.trim()) {
    results.push(result("error", "missing_cta", "The campaign has no CTA label."));
  }
  if (!campaign.facts.ctaUrl.trim()) {
    results.push(result("error", "invalid_cta_url", "The campaign has no CTA URL."));
  }

  const layoutSlots = LAYOUT_SLOTS[campaign.selectedLayoutId];
  const requiredImageSlot = layoutSlots.find(
    (slot) => slot.kind === "image" && slot.required,
  );
  if (requiredImageSlot && !hasImage) {
    results.push(
      result(
        "error",
        "missing_required_fact",
        "This layout requires at least one campaign image, but none was uploaded.",
        { suggestedAction: "Upload an image for this campaign before generating again." },
      ),
    );
  }

  const requiredNonImageSlots = layoutSlots.filter(
    (slot) => slot.required && slot.kind !== "image",
  );
  for (const slot of requiredNonImageSlots) {
    const block = document.blocks.find((candidate) => candidate.id === slot.slotId);
    const hasContent = Boolean(
      block &&
        ((block.type === "text" && block.content.trim().length > 0) ||
          (block.type === "headline" && block.content.trim().length > 0) ||
          (block.type === "button" && block.label.trim().length > 0)),
    );
    if (!hasContent) {
      results.push(
        result(
          "error",
          "missing_required_fact",
          `This layout requires content for "${slot.slotId}", but it's missing.`,
          { blockId: slot.slotId, suggestedAction: "Add this content before exporting." },
        ),
      );
    }
  }

  const footerBlock = document.blocks.find((block) => block.type === "footer");
  if (!footerBlock) {
    results.push(result("warning", "missing_footer", "No footer content was applied."));
  }

  for (const block of document.blocks) {
    if (block.type === "image" && !block.altText.trim()) {
      results.push(
        result("warning", "missing_alt_text", "An image is missing descriptive alt text.", {
          blockId: block.id,
        }),
      );
    }
  }

  const lowerContent = document.blocks
    .filter((block) => block.type === "text" || block.type === "headline")
    .map((block) => (block as { content: string }).content.toLowerCase())
    .join(" ");
  for (const term of brandProfile.prohibitedTerms) {
    if (term.trim() && lowerContent.includes(term.toLowerCase())) {
      results.push(
        result(
          "warning",
          "prohibited_term",
          `The generated copy may contain the prohibited term "${term}".`,
        ),
      );
    }
  }

  if (modelOutput) {
    for (const missingInput of modelOutput.missingInputs) {
      results.push(
        result("warning", "missing_required_fact", missingInput, {
          suggestedAction: "Add this detail to the campaign and generate again.",
        }),
      );
    }

    for (const warning of modelOutput.warnings) {
      results.push(result("warning", "missing_required_fact", warning));
    }
  }

  return results;
}
