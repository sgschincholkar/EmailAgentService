import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { EmailDocument } from "@/domain/schemas";

import { LayoutSwitchPanel } from "./layout-switch-panel";

const heroCtaDocument: EmailDocument = {
  id: "doc-1",
  campaignId: "campaign-1",
  kind: "base",
  version: 2,
  layoutId: "hero_cta",
  subject: "Subject",
  preheader: "Preheader",
  blocks: [
    {
      id: "hero_image",
      type: "image",
      assetId: "asset-1",
      altText: "A hero image",
      editable: true,
      lockedForVariants: false,
    },
    {
      id: "headline",
      type: "headline",
      content: "A headline",
      editable: true,
      lockedForVariants: false,
    },
    {
      id: "body",
      type: "text",
      content: "Body copy",
      editable: true,
      lockedForVariants: false,
    },
    {
      id: "cta",
      type: "button",
      label: "Learn more",
      href: "https://example.com",
      editable: true,
      lockedForVariants: false,
    },
    {
      id: "footer",
      type: "footer",
      html: "Footer html",
      editable: false,
      lockedForVariants: true,
    },
  ],
  sourceFacts: [],
  validationResults: [],
  renderedHtml: "<p>x</p>",
  plainText: "x",
  status: "generated",
  createdAt: "2026-09-05T06:00:00.000Z",
  updatedAt: "2026-09-05T06:00:00.000Z",
};

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockClear();
});

describe("LayoutSwitchPanel", () => {
  it("shows only the 3 other layouts, not the current one", () => {
    render(<LayoutSwitchPanel campaignId="campaign-1" document={heroCtaDocument} />);

    const select = screen.getByLabelText("Switch to") as HTMLSelectElement;
    const optionLabels = Array.from(select.options).map((o) => o.textContent);
    expect(optionLabels).toContain("Event invitation");
    expect(optionLabels).toContain("Simple announcement");
    expect(optionLabels).toContain("Offer highlight");
    expect(optionLabels).not.toContain("Visual spotlight");
  });

  it("does not fire any request on layout selection alone", () => {
    vi.stubGlobal("fetch", vi.fn());

    render(<LayoutSwitchPanel campaignId="campaign-1" document={heroCtaDocument} />);
    fireEvent.change(screen.getByLabelText("Switch to"), {
      target: { value: "text_announcement" },
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows kept and removed blocks before any confirmation", () => {
    render(<LayoutSwitchPanel campaignId="campaign-1" document={heroCtaDocument} />);
    fireEvent.change(screen.getByLabelText("Switch to"), {
      target: { value: "text_announcement" },
    });

    const preview = screen.getByRole("status");
    expect(preview.textContent).toContain("Kept:");
    expect(preview.textContent).toContain("Headline");
    expect(preview.textContent).toContain("Body");
    expect(preview.textContent).toContain("Removed:");
    expect(preview.textContent).toContain("Hero image");
  });

  it("shows a missing-content note and disables Confirm when the target needs content the source lacks", () => {
    render(<LayoutSwitchPanel campaignId="campaign-1" document={heroCtaDocument} />);
    fireEvent.change(screen.getByLabelText("Switch to"), {
      target: { value: "promotion_offer" },
    });

    expect(screen.getByText(/needs Offer details/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm switch" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("only fires the request when Confirm switch is explicitly clicked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ documentId: "doc-2", version: 3 }), { status: 201 }),
      ),
    );

    render(<LayoutSwitchPanel campaignId="campaign-1" document={heroCtaDocument} />);
    fireEvent.change(screen.getByLabelText("Switch to"), {
      target: { value: "text_announcement" },
    });
    expect(fetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirm switch" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const [, requestInit] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(requestInit.body)).toMatchObject({
      baseDocumentId: "doc-1",
      expectedVersion: 2,
      targetLayoutId: "text_announcement",
    });
  });

  it("navigates to the new version on a successful confirmed switch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ documentId: "doc-2", version: 3 }), { status: 201 }),
      ),
    );

    render(<LayoutSwitchPanel campaignId="campaign-1" document={heroCtaDocument} />);
    fireEvent.change(screen.getByLabelText("Switch to"), {
      target: { value: "text_announcement" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm switch" }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/campaigns/campaign-1/preview?version=3&created=1"),
    );
  });

  it("shows a conflict message without navigating on a 409", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Newer version exists.", latestVersion: 5 }), {
          status: 409,
        }),
      ),
    );

    render(<LayoutSwitchPanel campaignId="campaign-1" document={heroCtaDocument} />);
    fireEvent.change(screen.getByLabelText("Switch to"), {
      target: { value: "text_announcement" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm switch" }));

    await waitFor(() => expect(screen.getByText(/v5/)).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
  });

  it("shows an error without navigating on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Couldn't switch the layout." }), { status: 500 }),
      ),
    );

    render(<LayoutSwitchPanel campaignId="campaign-1" document={heroCtaDocument} />);
    fireEvent.change(screen.getByLabelText("Switch to"), {
      target: { value: "text_announcement" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm switch" }));

    await waitFor(() => expect(screen.getByText("Couldn't switch the layout.")).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
  });
});
