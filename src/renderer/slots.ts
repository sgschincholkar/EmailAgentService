import type {
  ButtonEmailBlock,
  EmailBlock,
  ImageEmailBlock,
  TextEmailBlock,
} from "@/domain/schemas";

import { RenderError } from "./render-error";

function findBlock(blocks: EmailBlock[], id: string): EmailBlock | undefined {
  return blocks.find((block) => block.id === id);
}

export function requireTextBlock(blocks: EmailBlock[], slotId: string): TextEmailBlock {
  const block = findBlock(blocks, slotId);
  if (!block || block.type === "footer" || block.type === "image" || block.type === "button") {
    throw new RenderError(
      "missing_required_block",
      `Required text block for slot "${slotId}" is missing.`,
      { slotId, blockId: block?.id },
    );
  }
  return block;
}

export function optionalTextBlock(
  blocks: EmailBlock[],
  slotId: string,
): TextEmailBlock | undefined {
  const block = findBlock(blocks, slotId);
  if (!block || block.type === "footer" || block.type === "image" || block.type === "button") {
    return undefined;
  }
  return block;
}

export function requireImageBlock(blocks: EmailBlock[], slotId: string): ImageEmailBlock {
  const block = findBlock(blocks, slotId);
  if (!block || block.type !== "image") {
    throw new RenderError(
      "missing_required_block",
      `Required image block for slot "${slotId}" is missing.`,
      { slotId, blockId: block?.id },
    );
  }
  return block;
}

export function requireButtonBlock(blocks: EmailBlock[], slotId: string): ButtonEmailBlock {
  const block = findBlock(blocks, slotId);
  if (!block || block.type !== "button") {
    throw new RenderError(
      "missing_required_block",
      `Required button block for slot "${slotId}" is missing.`,
      { slotId, blockId: block?.id },
    );
  }
  return block;
}
