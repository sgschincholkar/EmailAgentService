import { EmailDocumentSchema, type EmailDocument } from "@/domain/schemas";

export const webinarEventFixture: EmailDocument = EmailDocumentSchema.parse({
  id: "email-fixture-webinar-event",
  campaignId: "campaign-fixture-2",
  kind: "base",
  version: 1,
  layoutId: "webinar_event",
  subject: "Join us: The future of async product teams",
  preheader: "A live session with Avery Chen, October 3 at 10am ET.",
  blocks: [
    {
      id: "headline",
      type: "headline",
      content: "The future of async product teams",
      editable: true,
      lockedForVariants: false,
    },
    {
      id: "event_details",
      type: "text",
      content:
        "October 3, 2026 · 10:00 AM ET\nSpeaker: Avery Chen, Head of Product\n<Registration required>",
      editable: true,
      lockedForVariants: false,
    },
    {
      id: "body",
      type: "text",
      content:
        "We'll cover what's next for teams shipping >10 releases a week & how to keep everyone in sync.",
      editable: true,
      lockedForVariants: false,
    },
    {
      id: "cta",
      type: "button",
      label: "Save my seat",
      href: "https://northstar.example/webinar",
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
