import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { StorageAdapter } from "./storage-adapter";

/**
 * Development-only storage adapter. Writes files to a gitignored local
 * directory outside `public/`, served through an API route rather than as
 * static assets. Not suitable for deployed/shareable environments — those
 * require an R2/S3-compatible adapter (not built in Slice 3).
 */
const LOCAL_ASSETS_DIR = path.join(process.cwd(), ".local-assets");

export class LocalStorageAdapter implements StorageAdapter {
  // mimeType is part of the StorageAdapter contract (an R2/S3 adapter needs
  // it for the object's Content-Type); unused here since the key already
  // carries a file extension.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async upload(file: Buffer, key: string, mimeType: string): Promise<void> {
    await mkdir(LOCAL_ASSETS_DIR, { recursive: true });
    await writeFile(path.join(LOCAL_ASSETS_DIR, key), file);
  }

  getUrl(key: string): string {
    return `/api/assets/${key}`;
  }

  async delete(key: string): Promise<void> {
    await rm(path.join(LOCAL_ASSETS_DIR, key), { force: true });
  }

  async read(key: string): Promise<Buffer> {
    return readFile(path.join(LOCAL_ASSETS_DIR, key));
  }
}
