import type { BrandProfile } from "@/domain/schemas";

import { escapeHtmlWithLineBreaks } from "./escape-html";
import type { FooterEmailBlock } from "@/domain/schemas";

const DEFAULT_BACKGROUND = "#ffffff";
const DEFAULT_TEXT_COLOR = "#333333";

export function wrapEmail(
  bodyHtml: string,
  footer: FooterEmailBlock,
  brand: BrandProfile,
  subject: string,
): string {
  const background = brand.colors.background ?? DEFAULT_BACKGROUND;
  const textColor = brand.colors.text ?? DEFAULT_TEXT_COLOR;
  const fontFamily = brand.emailFontStack;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtmlWithLineBreaks(subject)}</title>
</head>
<body style="margin:0; padding:0; background-color:${background};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; background-color:${background};">
<tr>
<td align="center" style="padding:24px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; font-family:${fontFamily}; color:${textColor};">
${bodyHtml}
${renderFooterRow(footer, fontFamily)}
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

function renderFooterRow(footer: FooterEmailBlock, fontFamily: string): string {
  return `<tr>
<td style="padding:24px 16px; font-family:${fontFamily}; font-size:12px; line-height:1.5; color:#6b7280;">
${escapeHtmlWithLineBreaks(footer.html)}
</td>
</tr>`;
}
