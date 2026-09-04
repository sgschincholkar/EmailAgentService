import { BrandProfileSchema, type BrandProfile } from "@/domain/schemas";

export const demoBrandProfile: BrandProfile = BrandProfileSchema.parse({
  id: "brand-fixture-1",
  name: "Northstar Studio",
  colors: {
    primary: "#2563EB",
    secondary: "#F59E0B",
    background: "#FFFFFF",
    text: "#1F2937",
  },
  emailFontStack: "Arial, Helvetica, sans-serif",
  tone: ["Warm", "Direct"],
  preferredTerms: ["workspace"],
  prohibitedTerms: ["synergy"],
  defaultCtaStyle: "filled",
  defaultFooterHtml:
    "Northstar Studio, 123 Market St, Suite 400\nYou're receiving this because you subscribed to product updates.",
  createdAt: "2026-09-04T06:00:00.000Z",
  updatedAt: "2026-09-04T06:00:00.000Z",
});
