import type { EmailBlock, LayoutId } from "@/domain/schemas";
import { LAYOUT_SLOTS } from "@/renderer/layout-slots";

export type LayoutSwitchMapping = {
  blocks: EmailBlock[];
  /** Block ids carried over into the target layout, unchanged. */
  kept: string[];
  /** Block ids present on the source document but dropped by the target layout. */
  removed: string[];
  /** Required target-layout slot ids that have no content after the mapping — never invented, only surfaced. */
  missingRequired: string[];
};

/**
 * Pure block-id-based mapping from a source document's blocks to a target
 * layout's slot set. No Claude call, no invented content — a block is
 * carried over only when the target layout declares a slot with the exact
 * same id (headline/body/cta/footer/hero_image/event_details/
 * offer_details); anything else is dropped. If a required target slot has
 * no surviving content, it's reported in missingRequired rather than
 * filled in — the caller (validation) surfaces this, this function never
 * fabricates a value.
 *
 * Exported for reuse by both the server-side switch pipeline and the
 * client-side confirmation-diff UI — it has no server-only imports.
 */
export function mapBlocksToLayout(
  sourceBlocks: EmailBlock[],
  targetLayoutId: LayoutId,
): LayoutSwitchMapping {
  const targetSlotIds = new Set(LAYOUT_SLOTS[targetLayoutId].map((slot) => slot.slotId));
  const requiredSlotIds = new Set(
    LAYOUT_SLOTS[targetLayoutId].filter((slot) => slot.required).map((slot) => slot.slotId),
  );

  const blocks: EmailBlock[] = [];
  const kept: string[] = [];
  const removed: string[] = [];

  for (const block of sourceBlocks) {
    if (block.type === "footer") {
      blocks.push(block);
      continue;
    }
    if (targetSlotIds.has(block.id)) {
      blocks.push(block);
      kept.push(block.id);
    } else {
      removed.push(block.id);
    }
  }

  const survivingIds = new Set(blocks.map((block) => block.id));
  const missingRequired = [...requiredSlotIds].filter((slotId) => !survivingIds.has(slotId));

  return { blocks, kept, removed, missingRequired };
}
