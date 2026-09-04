import { EmailDocumentSchema, type EmailDocument } from "@/domain/schemas";

export const textAnnouncementFixture: EmailDocument = EmailDocumentSchema.parse({
  id: "email-fixture-text-announcement",
  campaignId: "campaign-fixture-3",
  kind: "base",
  version: 1,
  layoutId: "text_announcement",
  subject: "A quick update on your account",
  preheader: "We've made a small change to how billing works.",
  blocks: [
    {
      id: "headline",
      type: "headline",
      content: "A quick update on your account",
      editable: true,
      lockedForVariants: false,
    },
    {
      id: "body",
      type: "text",
      content:
        "Starting next month, invoices will show usage & credits on one line instead of two. Nothing else changes.",
      editable: true,
      lockedForVariants: false,
    },
    {
      id: "cta",
      type: "button",
      label: "Review your account",
      href: "https://app.northstar.example/billing",
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
