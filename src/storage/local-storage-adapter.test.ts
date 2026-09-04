import { afterEach, describe, expect, it } from "vitest";

import { LocalStorageAdapter } from "./local-storage-adapter";

describe("LocalStorageAdapter", () => {
  const adapter = new LocalStorageAdapter();
  const testKeys: string[] = [];

  function testKey(suffix: string): string {
    const key = `test-${crypto.randomUUID()}${suffix}`;
    testKeys.push(key);
    return key;
  }

  afterEach(async () => {
    // Only remove the specific keys this test file created — never a broad
    // directory wipe, so manual developer uploads in .local-assets/ are
    // never touched by the test suite.
    while (testKeys.length > 0) {
      const key = testKeys.pop();
      if (key) await adapter.delete(key);
    }
  });

  it("writes a file that can be read back with the same bytes", async () => {
    const key = testKey(".png");
    const bytes = Buffer.from("fake-png-bytes-for-test");

    await adapter.upload(bytes, key, "image/png");
    const readBack = await adapter.read(key);

    expect(readBack.equals(bytes)).toBe(true);
  });

  it("getUrl returns the API route path for the key", () => {
    expect(adapter.getUrl("abc123.png")).toBe("/api/assets/abc123.png");
  });

  it("delete removes the file", async () => {
    const key = testKey(".png");
    await adapter.upload(Buffer.from("x"), key, "image/png");

    await adapter.delete(key);

    await expect(adapter.read(key)).rejects.toThrow();
  });
});
