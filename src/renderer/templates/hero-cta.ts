import type { BrandProfile, EmailBlock } from "@/domain/schemas";

import { renderButtonRow, renderHeadlineRow, renderImageRow, renderTextRow } from "../blocks";
import {
  requireButtonBlock,
  requireImageBlock,
  requireTextBlock,
} from "../slots";

export function renderHeroCtaBody(
  blocks: EmailBlock[],
  brand: BrandProfile,
  resolveAssetUrl: (assetId: string) => string,
): string {
  const heroImage = requireImageBlock(blocks, "hero_image");
  const headline = requireTextBlock(blocks, "headline");
  const body = requireTextBlock(blocks, "body");
  const cta = requireButtonBlock(blocks, "cta");

  return [
    renderImageRow(heroImage, resolveAssetUrl),
    renderHeadlineRow(headline, brand),
    renderTextRow(body),
    renderButtonRow(cta, brand),
  ].join("\n");
}
