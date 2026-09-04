import { describe, expect, it } from "vitest";

import { buildEmailDownloadFilename, slugifyCampaignName } from "./campaign-slug";

describe("slugifyCampaignName", () => {
  it("lowercases and hyphenates a normal name", () => {
    expect(slugifyCampaignName("Spring Launch")).toBe("spring-launch");
  });

  it("collapses non-alphanumeric runs into a single hyphen", () => {
    expect(slugifyCampaignName("Q4 / UK test")).toBe("q4-uk-test");
  });

  it("falls back to a stable slug when the result would be empty", () => {
    expect(slugifyCampaignName("!!!")).toBe("campaign");
    expect(slugifyCampaignName("   ")).toBe("campaign");
    expect(slugifyCampaignName("")).toBe("campaign");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugifyCampaignName("--Launch--")).toBe("launch");
  });

  it("strips unicode characters that are not a-z0-9", () => {
    expect(slugifyCampaignName("Café Été 2026")).toBe("caf-t-2026");
  });

  it("never contains a path separator", () => {
    expect(slugifyCampaignName("../../etc/passwd")).not.toContain("/");
  });
});

describe("buildEmailDownloadFilename", () => {
  it("builds the expected filename with version", () => {
    expect(buildEmailDownloadFilename("Spring Launch", 1)).toBe(
      "spring-launch-email-v1.html",
    );
  });

  it("uses the fallback slug for a name with no safe characters", () => {
    expect(buildEmailDownloadFilename("!!!", 3)).toBe("campaign-email-v3.html");
  });

  it("handles the Q4/UK example exactly", () => {
    expect(buildEmailDownloadFilename("Q4 / UK test", 1)).toBe("q4-uk-test-email-v1.html");
  });
});
