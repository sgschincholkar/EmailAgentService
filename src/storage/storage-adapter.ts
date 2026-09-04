/**
 * Pluggable asset storage contract. Binary file data never lives in
 * Postgres — only the resulting storageKey/publicUrl and metadata do.
 *
 * LocalStorageAdapter (this slice) is the only implementation. An
 * R2/S3-compatible adapter implementing this same interface, configured via
 * env vars, is a required deployment gate before any deployed or shareable
 * environment — not built in Slice 3.
 */
export interface StorageAdapter {
  upload(file: Buffer, key: string, mimeType: string): Promise<void>;
  getUrl(key: string): string;
  delete(key: string): Promise<void>;
}
