// @vitest-environment node
//
// jsdom's FormData/Blob/File implementation corrupts binary content passed
// through a Request body round-trip (verified: a 139-byte PNG became 9
// bytes after `request.formData()`). This route handles real binary
// uploads, so its tests need Node's native, spec-correct implementations.
import { readFileSync } from "node:fs";
import path from "node:path";

import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/db/client";
import { assets } from "@/db/schema";
import { LocalStorageAdapter } from "@/storage/local-storage-adapter";

import { POST } from "./route";

const FIXTURES_DIR = path.join(process.cwd(), "src/renderer/fixtures/images");
const validPngBytes = readFileSync(path.join(FIXTURES_DIR, "logo.png"));

const createdAssetIds: string[] = [];
const createdStorageKeys: string[] = [];
const storage = new LocalStorageAdapter();

function buildUploadRequest(file: File, type = "logo"): Request {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);
  return new Request("http://localhost/api/assets", {
    method: "POST",
    body: formData,
  });
}

afterAll(async () => {
  // Clean up only the rows and files this test file created.
  if (createdAssetIds.length > 0) {
    await db.delete(assets).where(inArray(assets.id, createdAssetIds));
  }
  for (const key of createdStorageKeys) {
    await storage.delete(key);
  }
});

describe("POST /api/assets", () => {
  it("stores the file and creates an Asset record with correct metadata", async () => {
    const file = new File([validPngBytes], "logo.png", { type: "image/png" });
    const response = await POST(buildUploadRequest(file));

    expect(response.status).toBe(201);
    const body = await response.json();
    createdAssetIds.push(body.id);
    createdStorageKeys.push(body.storageKey);

    expect(body.type).toBe("logo");
    expect(body.filename).toBe("logo.png");
    expect(body.mimeType).toBe("image/png");
    expect(body.sizeBytes).toBe(validPngBytes.byteLength);
    expect(body.width).toBeGreaterThan(0);
    expect(body.height).toBeGreaterThan(0);
    expect(typeof body.storageKey).toBe("string");

    const [row] = await db.select().from(assets).where(eq(assets.id, body.id));
    expect(row).toBeDefined();
    expect(row.storageKey).toBe(body.storageKey);
  });

  it("rejects a non-image file with 400", async () => {
    const file = new File([Buffer.from("not an image")], "doc.pdf", {
      type: "application/pdf",
    });
    const response = await POST(buildUploadRequest(file));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  it("rejects a file over 5MB with 400", async () => {
    const oversized = Buffer.concat([validPngBytes, Buffer.alloc(6 * 1024 * 1024)]);
    const file = new File([oversized], "big.png", { type: "image/png" });
    const response = await POST(buildUploadRequest(file));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Images must be 5MB or smaller.");
  });

  it("rejects a request missing the asset type", async () => {
    const file = new File([validPngBytes], "logo.png", { type: "image/png" });
    const formData = new FormData();
    formData.append("file", file);
    const request = new Request("http://localhost/api/assets", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
