import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { assetRowToDomain } from "@/db/mappers";
import { assets } from "@/db/schema";
import { AssetTypeSchema } from "@/domain/schemas";
import { LocalStorageAdapter } from "@/storage/local-storage-adapter";
import { validateUpload } from "@/storage/validate-upload";

const storage = new LocalStorageAdapter();

export async function POST(request: Request): Promise<NextResponse> {
  const formData = await request.formData();
  const file = formData.get("file");
  const typeInput = formData.get("type");

  if (!isUploadedFile(file)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }

  const typeResult = AssetTypeSchema.safeParse(typeInput);
  if (!typeResult.success) {
    return NextResponse.json({ error: "Missing or invalid asset type." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const validation = validateUpload(bytes, file.type);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const extension = extensionForMimeType(file.type);
  const storageKey = `${crypto.randomUUID()}${extension}`;
  await storage.upload(bytes, storageKey, file.type);

  const [row] = await db
    .insert(assets)
    .values({
      type: typeResult.data,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: bytes.byteLength,
      storageKey,
      width: validation.width,
      height: validation.height,
    })
    .returning();

  return NextResponse.json(assetRowToDomain(row), { status: 201 });
}

// FormDataEntryValue's File instance may come from a different realm than
// this module's global `File` (e.g. next/server's polyfilled Request), so
// `instanceof File` is unreliable here — duck-type on the Blob-like shape.
function isUploadedFile(
  value: FormDataEntryValue | null,
): value is File & { arrayBuffer: () => Promise<ArrayBuffer> } {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function" &&
    "name" in value &&
    "type" in value
  );
}

function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    default:
      return "";
  }
}
