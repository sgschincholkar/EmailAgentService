import { afterEach, describe, expect, it, vi } from "vitest";

import * as generateModule from "@/generation/generate-campaign-email";
import { GenerationFailedError } from "@/generation/generate-campaign-email";
import { PreflightError } from "@/generation/preflight-check";

import { POST } from "./route";

function buildRequest(): Request {
  return new Request("http://localhost/api/campaigns/campaign-1/generate", {
    method: "POST",
  });
}

function buildParams(id = "campaign-1") {
  return { params: Promise.resolve({ id }) };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/campaigns/[id]/generate", () => {
  it("never includes the API key in a success response", async () => {
    vi.spyOn(generateModule, "generateCampaignEmail").mockResolvedValue({
      id: "doc-1",
    } as never);

    const response = await POST(buildRequest(), buildParams());
    const bodyText = await response.text();

    expect(bodyText).not.toContain("ANTHROPIC_API_KEY");
    expect(bodyText).not.toMatch(/sk-ant-/);
  });

  it("never includes the API key in an error response", async () => {
    vi.spyOn(generateModule, "generateCampaignEmail").mockRejectedValue(
      new GenerationFailedError("Generation failed. Try again."),
    );

    const response = await POST(buildRequest(), buildParams());
    const bodyText = await response.text();

    expect(response.status).toBe(502);
    expect(bodyText).not.toContain("ANTHROPIC_API_KEY");
    expect(bodyText).not.toMatch(/sk-ant-/);
  });

  it("maps a PreflightError to a 400 with a plain user-facing message", async () => {
    vi.spyOn(generateModule, "generateCampaignEmail").mockRejectedValue(
      new PreflightError("This campaign needs a CTA label and destination URL before generating."),
    );

    const response = await POST(buildRequest(), buildParams());
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe(
      "This campaign needs a CTA label and destination URL before generating.",
    );
  });
});
