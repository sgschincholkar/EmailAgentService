"use client";

import type { Asset, AssetType } from "@/domain/schemas";

export class UploadAssetError extends Error {}

/**
 * Uploads a file to the asset API route. Immediate-upload-on-selection —
 * called as soon as the user picks a file, not deferred to form submit.
 */
export async function uploadAsset(file: File, type: AssetType): Promise<Asset> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);

  const response = await fetch("/api/assets", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new UploadAssetError(body?.error ?? "Upload failed. Try again.");
  }

  return response.json();
}
