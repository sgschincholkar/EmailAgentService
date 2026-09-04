import { EmailDocumentSchema, type EmailDocument } from "@/domain/schemas";

export const promotionOfferFixture: EmailDocument = EmailDocumentSchema.parse({
  id: "email-fixture-promotion-offer",
  campaignId: "campaign-fixture-4",
  kind: "base",
  version: 1,
  layoutId: "promotion_offer",
  subject: "20% off Northstar Pro through the end of the month",
  preheader: "Upgrade before September 30 to lock in the discount.",
  blocks: [
    {
      id: "hero_image",
      type: "image",
      assetId: "fixture-asset-product",
      altText: "Northstar Pro dashboard preview",
      editable: true,
      lockedForVariants: false,
    },
    {
      id: "headline",
      type: "headline",
      content: "20% off Northstar Pro",
      editable: true,
      lockedForVariants: false,
    },
    {
      id: "offer_details",
      type: "text",
      content:
        "20% off your first year\nOffer ends September 30, 2026\n<New customers only>",
      editable: true,
      lockedForVariants: false,
    },
    {
      id: "body",
      type: "text",
      content:
        "Pro unlocks unlimited workspaces, priority support & advanced permissions — all for less than a coffee a week.",
      editable: true,
      lockedForVariants: false,
    },
    {
      id: "cta",
      type: "button",
      label: "Upgrade to Pro",
      href: "https://app.northstar.example/upgrade",
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
