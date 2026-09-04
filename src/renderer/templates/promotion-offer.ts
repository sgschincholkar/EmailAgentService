import type { BrandProfile, EmailBlock } from "@/domain/schemas";

import { renderButtonRow, renderHeadlineRow, renderImageRow, renderTextRow } from "../blocks";
import {
  requireButtonBlock,
  requireImageBlock,
  requireTextBlock,
} from "../slots";

export function renderPromotionOfferBody(
  blocks: EmailBlock[],
  brand: BrandProfile,
  resolveAssetUrl: (assetId: string) => string,
): string {
  const heroImage = requireImageBlock(blocks, "hero_image");
  const headline = requireTextBlock(blocks, "headline");
  const offerDetails = requireTextBlock(blocks, "offer_details");
  const body = requireTextBlock(blocks, "body");
  const cta = requireButtonBlock(blocks, "cta");

  return [
    renderImageRow(heroImage, resolveAssetUrl),
    renderHeadlineRow(headline, brand),
    renderTextRow(offerDetails),
    renderTextRow(body),
    renderButtonRow(cta, brand),
  ].join("\n");
}
