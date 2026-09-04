import type { LayoutId } from "@/domain/schemas";

export type SlotKind = "text" | "image" | "button";

export type SlotSpec = {
  slotId: string;
  kind: SlotKind;
  required: boolean;
};

/**
 * Single source of truth for which slots each layout accepts, shared by
 * the renderer's templates (implicitly, via the requireTextBlock /
 * optionalTextBlock style calls in src/renderer/templates/) and Slice 4's
 * generation output schema. Keep in sync with the required/optional block
 * calls in those templates.
 */
export const LAYOUT_SLOTS: Record<LayoutId, SlotSpec[]> = {
  hero_cta: [
    { slotId: "hero_image", kind: "image", required: true },
    { slotId: "headline", kind: "text", required: true },
    { slotId: "body", kind: "text", required: true },
    { slotId: "cta", kind: "button", required: true },
  ],
  webinar_event: [
    { slotId: "headline", kind: "text", required: true },
    { slotId: "event_details", kind: "text", required: true },
    { slotId: "body", kind: "text", required: true },
    { slotId: "cta", kind: "button", required: true },
    { slotId: "hero_image", kind: "image", required: false },
  ],
  text_announcement: [
    { slotId: "headline", kind: "text", required: true },
    { slotId: "body", kind: "text", required: true },
    { slotId: "cta", kind: "button", required: true },
  ],
  promotion_offer: [
    { slotId: "hero_image", kind: "image", required: true },
    { slotId: "headline", kind: "text", required: true },
    { slotId: "offer_details", kind: "text", required: true },
    { slotId: "body", kind: "text", required: true },
    { slotId: "cta", kind: "button", required: true },
  ],
};

export function requiredSlots(layoutId: LayoutId): SlotSpec[] {
  return LAYOUT_SLOTS[layoutId].filter((slot) => slot.required);
}

export function allowedSlotIds(layoutId: LayoutId): string[] {
  return LAYOUT_SLOTS[layoutId].map((slot) => slot.slotId);
}
