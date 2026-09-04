import type {
  BrandProfile,
  ButtonEmailBlock,
  ImageEmailBlock,
  TextEmailBlock,
} from "@/domain/schemas";

import { escapeHtml, escapeHtmlWithLineBreaks } from "./escape-html";
import { sanitizeUrl } from "./sanitize-url";

const DEFAULT_PRIMARY = "#2563EB";

export function renderHeadlineRow(block: TextEmailBlock, brand: BrandProfile): string {
  const color = brand.colors.primary ?? DEFAULT_PRIMARY;
  return `<tr>
<td style="padding:0 16px 16px; font-size:24px; font-weight:bold; line-height:1.3; color:${color};">
${escapeHtmlWithLineBreaks(block.content)}
</td>
</tr>`;
}

export function renderTextRow(block: TextEmailBlock): string {
  return `<tr>
<td style="padding:0 16px 16px; font-size:16px; line-height:1.5;">
${escapeHtmlWithLineBreaks(block.content)}
</td>
</tr>`;
}

export function renderImageRow(
  block: ImageEmailBlock,
  resolveAssetUrl: (assetId: string) => string,
): string {
  const rawUrl = resolveAssetUrl(block.assetId);
  const url = sanitizeUrl(rawUrl, { blockId: block.id });
  return `<tr>
<td style="padding:0 0 16px;">
<img src="${url}" alt="${escapeHtml(block.altText)}" width="600" style="display:block; width:100%; height:auto; max-width:600px;">
</td>
</tr>`;
}

export function renderButtonRow(
  block: ButtonEmailBlock,
  brand: BrandProfile,
): string {
  const url = sanitizeUrl(block.href, { blockId: block.id });
  const primary = brand.colors.primary ?? DEFAULT_PRIMARY;
  const label = escapeHtml(block.label);

  const cellStyle =
    brand.defaultCtaStyle === "outline"
      ? `background-color:transparent; border:2px solid ${primary}; color:${primary};`
      : `background-color:${primary}; border:2px solid ${primary}; color:#ffffff;`;

  return `<tr>
<td style="padding:8px 16px 24px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="border-radius:6px; ${cellStyle}">
<a href="${url}" style="display:inline-block; padding:12px 24px; font-size:16px; font-weight:bold; text-decoration:none; ${cellStyle}">${label}</a>
</td>
</tr>
</table>
</td>
</tr>`;
}

