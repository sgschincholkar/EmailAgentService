import type { BrandProfile, EmailDocument } from "@/domain/schemas";

import { RenderError } from "./render-error";
import { resolveFooter } from "./resolve-footer";
import { derivePlainText } from "./plain-text";
import { wrapEmail } from "./scaffold";
import { renderHeroCtaBody } from "./templates/hero-cta";
import { renderPromotionOfferBody } from "./templates/promotion-offer";
import { renderTextAnnouncementBody } from "./templates/text-announcement";
import { renderWebinarEventBody } from "./templates/webinar-event";

export type RenderEmailOptions = {
  resolveAssetUrl?: (assetId: string) => string;
};

export type RenderEmailResult = {
  html: string;
  plainText: string;
};

function defaultResolveAssetUrl(assetId: string): string {
  throw new RenderError(
    "unresolved_asset",
    `No asset URL resolver was provided to resolve asset "${assetId}".`,
    { blockId: assetId },
  );
}

/**
 * Pure function: same EmailDocument + BrandProfile + resolver always
 * produces the same output. No database or storage access — Slice 2 does
 * not resolve real asset URLs; callers supply resolveAssetUrl (fixtures in
 * this slice, real storage lookups from Slice 3 onward).
 */
export function renderEmail(
  emailDocument: EmailDocument,
  brandProfile: BrandProfile,
  options?: RenderEmailOptions,
): RenderEmailResult {
  const resolveAssetUrl = options?.resolveAssetUrl ?? defaultResolveAssetUrl;
  const footer = resolveFooter(emailDocument.blocks, brandProfile);

  const bodyHtml = renderBody(emailDocument, brandProfile, resolveAssetUrl);
  const html = wrapEmail(bodyHtml, footer, brandProfile, emailDocument.subject);
  const plainText = derivePlainText(emailDocument, footer);

  return { html, plainText };
}

function renderBody(
  doc: EmailDocument,
  brand: BrandProfile,
  resolveAssetUrl: (assetId: string) => string,
): string {
  switch (doc.layoutId) {
    case "hero_cta":
      return renderHeroCtaBody(doc.blocks, brand, resolveAssetUrl);
    case "webinar_event":
      return renderWebinarEventBody(doc.blocks, brand, resolveAssetUrl);
    case "text_announcement":
      return renderTextAnnouncementBody(doc.blocks, brand);
    case "promotion_offer":
      return renderPromotionOfferBody(doc.blocks, brand, resolveAssetUrl);
  }
}
