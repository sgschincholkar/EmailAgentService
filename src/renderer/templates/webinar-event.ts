import type { BrandProfile, EmailBlock } from "@/domain/schemas";

import { renderButtonRow, renderHeadlineRow, renderImageRow, renderTextRow } from "../blocks";
import { requireButtonBlock, requireImageBlock, requireTextBlock } from "../slots";

export function renderWebinarEventBody(
  blocks: EmailBlock[],
  brand: BrandProfile,
  resolveAssetUrl: (assetId: string) => string,
): string {
  const headline = requireTextBlock(blocks, "headline");
  const eventDetails = requireTextBlock(blocks, "event_details");
  const body = requireTextBlock(blocks, "body");
  const cta = requireButtonBlock(blocks, "cta");
  const optionalImage = blocks.find(
    (block) => block.id === "hero_image" && block.type === "image",
  );

  const rows = [renderHeadlineRow(headline, brand)];

  if (optionalImage) {
    rows.push(renderImageRow(requireImageBlock(blocks, "hero_image"), resolveAssetUrl));
  }

  rows.push(
    renderTextRow(eventDetails),
    renderTextRow(body),
    renderButtonRow(cta, brand),
  );

  return rows.join("\n");
}
