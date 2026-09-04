import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VersionHistory } from "./version-history";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

const versions = [
  { id: "doc-2", version: 2, createdAt: "2026-09-04T08:00:00.000Z" },
  { id: "doc-1", version: 1, createdAt: "2026-09-04T06:00:00.000Z" },
];

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockClear();
});

describe("VersionHistory", () => {
  it("marks the latest version as Current and does not show restore for it", () => {
    render(
      <VersionHistory
        campaignId="campaign-1"
        displayedVersion={2}
        latestVersion={2}
        versions={versions}
      />,
    );

    expect(screen.getByText("Current")).toBeTruthy();
    const entries = screen.getAllByRole("listitem");
    const latestEntry = entries.find((entry) => entry.textContent?.includes("Version 2"));
    expect(latestEntry?.textContent).not.toContain("Restore as new version");
  });

  it("shows a Restore action for a historical (non-latest) version", () => {
    render(
      <VersionHistory
        campaignId="campaign-1"
        displayedVersion={2}
        latestVersion={2}
        versions={versions}
      />,
    );

    expect(screen.getByRole("button", { name: "Restore as new version" })).toBeTruthy();
  });

  it("calls the restore endpoint and navigates to the new version on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ documentId: "doc-3", version: 3 }), { status: 201 }),
      ),
    );

    render(
      <VersionHistory
        campaignId="campaign-1"
        displayedVersion={1}
        latestVersion={2}
        versions={versions}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Restore as new version" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/campaigns/campaign-1/preview?version=3"));
  });

  it("shows an error message when restore fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Couldn't restore this version." }), {
          status: 500,
        }),
      ),
    );

    render(
      <VersionHistory
        campaignId="campaign-1"
        displayedVersion={1}
        latestVersion={2}
        versions={versions}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Restore as new version" }));

    await waitFor(() => expect(screen.getByText("Couldn't restore this version.")).toBeTruthy());
  });
});
