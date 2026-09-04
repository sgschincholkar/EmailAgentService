import { NextResponse } from "next/server";

import { LocalStorageAdapter } from "@/storage/local-storage-adapter";

const storage = new LocalStorageAdapter();

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storageKey: string }> },
): Promise<NextResponse> {
  const { storageKey } = await params;

  // storageKey is always a server-generated UUID + extension (see
  // src/app/api/assets/route.ts) — reject anything else before touching
  // the filesystem, so a crafted key can never escape the assets directory.
  if (!/^[a-f0-9-]+\.(png|jpg|gif|webp)$/i.test(storageKey)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const bytes = await storage.read(storageKey);
    const extension = storageKey.slice(storageKey.lastIndexOf("."));
    const contentType = CONTENT_TYPE_BY_EXTENSION[extension] ?? "application/octet-stream";

    return new NextResponse(new Uint8Array(bytes), {
      headers: { "Content-Type": contentType },
    });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
