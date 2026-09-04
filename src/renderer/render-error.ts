export type RenderErrorCode =
  | "missing_required_block"
  | "unsafe_asset_url"
  | "unresolved_asset";

export class RenderError extends Error {
  code: RenderErrorCode;
  blockId?: string;
  slotId?: string;

  constructor(
    code: RenderErrorCode,
    message: string,
    details?: { blockId?: string; slotId?: string },
  ) {
    super(message);
    this.name = "RenderError";
    this.code = code;
    this.blockId = details?.blockId;
    this.slotId = details?.slotId;
  }
}
