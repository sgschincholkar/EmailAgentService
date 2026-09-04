import { EmailDocumentSchema, type EmailDocument } from "@/domain/schemas";

export const heroCtaFixture: EmailDocument = EmailDocumentSchema.parse({
  id: "email-fixture-hero-cta",
  campaignId: "campaign-fixture-1",
  kind: "base",
  version: 1,
  layoutId: "hero_cta",
  subject: "Your team's new home base is ready",
  preheader: "Shared Workspace brings your team into one real-time space.",
  blocks: [
    {
      id: "hero_image",
      type: "image",
      assetId: "fixture-asset-hero",
      altText: "Team collaborating in Shared Workspace",
      editable: true,
      lockedForVariants: false,
    },
    {
      id: "headline",
      type: "headline",
      content: "Your team's new home base",
      editable: true,
      lockedForVariants: false,
    },
    {
      id: "body",
      type: "text",
      content:
        "Shared Workspace puts your projects, conversations & files in one place. No more <context switching> between five tools.",
      editable: true,
      lockedForVariants: false,
    },
    {
      id: "cta",
      type: "button",
      label: "Try Shared Workspace",
      href: "https://app.northstar.example/workspaces",
      editable: true,
      lockedForVariants: false,
    },
  ],
  sourceFacts: [],
  validationResults: [],
  status: "generated",
  createdAt: "2026-09-04T06:00:00.000Z",
  updatedAt: "2026-09-04T06:00:00.000Z",
});
