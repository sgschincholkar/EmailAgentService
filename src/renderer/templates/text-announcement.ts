import type { BrandProfile, EmailBlock } from "@/domain/schemas";

import { renderButtonRow, renderHeadlineRow, renderTextRow } from "../blocks";
import { requireButtonBlock, requireTextBlock } from "../slots";

export function renderTextAnnouncementBody(
  blocks: EmailBlock[],
  brand: BrandProfile,
): string {
  const headline = requireTextBlock(blocks, "headline");
  const body = requireTextBlock(blocks, "body");
  const cta = requireButtonBlock(blocks, "cta");

  return [
    renderHeadlineRow(headline, brand),
    renderTextRow(body),
    renderButtonRow(cta, brand),
  ].join("\n");
}
