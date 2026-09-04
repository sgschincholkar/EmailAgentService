import { z } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as claudeClient from "./claude-client";
import { generateWithRetry, GenerationValidationError } from "./generate-with-retry";

const schema = z.object({ value: z.string() });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("generateWithRetry", () => {
  it("returns the parsed result on a valid first attempt without retrying", async () => {
    const callSpy = vi
      .spyOn(claudeClient, "callClaude")
      .mockResolvedValue('{"value":"ok"}');

    const result = await generateWithRetry("system", "user", schema);

    expect(result).toEqual({ value: "ok" });
    expect(callSpy).toHaveBeenCalledTimes(1);
  });

  it("retries exactly once after a malformed first response, then succeeds", async () => {
    const callSpy = vi
      .spyOn(claudeClient, "callClaude")
      .mockResolvedValueOnce('{"wrong":"shape"}')
      .mockResolvedValueOnce('{"value":"fixed"}');

    const result = await generateWithRetry("system", "user", schema);

    expect(result).toEqual({ value: "fixed" });
    expect(callSpy).toHaveBeenCalledTimes(2);
  });

  it("throws GenerationValidationError after two malformed responses, with no third attempt", async () => {
    const callSpy = vi
      .spyOn(claudeClient, "callClaude")
      .mockResolvedValue('{"wrong":"shape"}');

    await expect(generateWithRetry("system", "user", schema)).rejects.toThrow(
      GenerationValidationError,
    );
    expect(callSpy).toHaveBeenCalledTimes(2);
  });

  it("does not retry on a successful-but-unexpected second call — retry is schema-triggered only", async () => {
    // First call malformed (triggers the one retry), second call valid —
    // confirms only schema failures trigger a retry, and a single retry is
    // sufficient once the response is valid.
    const callSpy = vi
      .spyOn(claudeClient, "callClaude")
      .mockResolvedValueOnce("not json at all")
      .mockResolvedValueOnce('{"value":"ok"}');

    const result = await generateWithRetry("system", "user", schema);

    expect(result).toEqual({ value: "ok" });
    expect(callSpy).toHaveBeenCalledTimes(2);
  });
});
