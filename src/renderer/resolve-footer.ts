import type { BrandProfile, EmailBlock, FooterEmailBlock } from "@/domain/schemas";

/**
 * Resolves the footer block to render. `FooterEmailBlock.html` (despite its
 * field name) is never inserted as raw HTML — the renderer escapes it and
 * inserts controlled `<br>` line breaks. See escape-html.ts.
 *
 * Precedence: an EmailDocument-supplied FooterEmailBlock wins; otherwise a
 * non-editable footer is derived from BrandProfile.defaultFooterHtml.
 */
export function resolveFooter(
  blocks: EmailBlock[],
  brandProfile: BrandProfile,
): FooterEmailBlock {
  const existing = blocks.find(
    (block): block is FooterEmailBlock => block.type === "footer",
  );
  if (existing) return existing;

  return {
    id: "footer",
    type: "footer",
    html: brandProfile.defaultFooterHtml,
    editable: false,
    lockedForVariants: true,
  };
}
