export const DEFAULT_EMAIL_FONT_STACK = "Arial, Helvetica, sans-serif";

export const DEFAULT_FOOTER_HTML =
  "You are receiving this email because you subscribed to updates.";

export const DEFAULT_BRAND_PROFILE_CTA_STYLE = "filled" as const;

/**
 * Values for an unfilled Brand Profile form. `primary` and `tone` deliberately
 * remain invalid until a user supplies them, so the form cannot appear valid by
 * default.
 */
export const BLANK_BRAND_PROFILE_INPUT = {
  name: "",
  logoAssetId: undefined as string | undefined,
  colors: {
    primary: "",
    secondary: "",
    accent: "",
    background: "",
    text: "",
  },
  preferredFont: "",
  emailFontStack: DEFAULT_EMAIL_FONT_STACK,
  tone: [] as string[],
  voiceNotes: "",
  preferredTerms: [] as string[],
  prohibitedTerms: [] as string[],
  defaultCtaStyle: DEFAULT_BRAND_PROFILE_CTA_STYLE,
  defaultFooterHtml: DEFAULT_FOOTER_HTML,
};

export function createBlankBrandProfileFormValues() {
  return {
    ...BLANK_BRAND_PROFILE_INPUT,
    colors: { ...BLANK_BRAND_PROFILE_INPUT.colors },
    tone: [],
    preferredTerms: [],
    prohibitedTerms: [],
  };
}
