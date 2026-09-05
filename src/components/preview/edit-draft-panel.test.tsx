import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { EmailDocument } from "@/domain/schemas";

import { EditDraftPanel } from "./edit-draft-panel";

const baseDocument: EmailDocument = {
  id: "doc-1",
  campaignId: "campaign-1",
  kind: "base",
  version: 2,
  layoutId: "text_announcement",
  subject: "Original subject",
  preheader: "Original preheader",
  blocks: [
    {
      id: "headline",
      type: "headline",
      content: "Original headline",
      editable: true,
      lockedForVariants: false,
    },
    {
      id: "body",
      type: "text",
      content: "Original body",
      editable: true,
      lockedForVariants: false,
    },
    {
      id: "cta",
      type: "button",
      label: "Try it now",
      href: "https://app.example.com/try",
      editable: true,
      lockedForVariants: false,
    },
    {
      id: "footer",
      type: "footer",
      html: "Locked footer",
      editable: false,
      lockedForVariants: true,
    },
  ],
  sourceFacts: [],
  validationResults: [],
  renderedHtml: "<p>x</p>",
  plainText: "x",
  status: "generated",
  createdAt: "2026-09-04T06:00:00.000Z",
  updatedAt: "2026-09-04T06:00:00.000Z",
};

const imageDocument: EmailDocument = {
  ...baseDocument,
  layoutId: "hero_cta",
  blocks: [
    {
      id: "hero_image",
      type: "image",
      assetId: "asset-old",
      altText: "Original alt text",
      editable: true,
      lockedForVariants: false,
    },
    ...baseDocument.blocks,
  ],
};

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

const uploadAssetMock = vi.fn();
vi.mock("@/components/asset/upload-asset", async () => {
  const actual = await vi.importActual<typeof import("@/components/asset/upload-asset")>(
    "@/components/asset/upload-asset",
  );
  return {
    ...actual,
    uploadAsset: (...args: Parameters<typeof actual.uploadAsset>) => uploadAssetMock(...args),
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockClear();
  uploadAssetMock.mockClear();
});

describe("EditDraftPanel", () => {
  it("shows only fields present in the selected layout, with no footer control", () => {
    render(<EditDraftPanel campaignId="campaign-1" document={baseDocument} />);

    expect(screen.getByLabelText("Subject")).toBeTruthy();
    expect(screen.getByLabelText("Preheader")).toBeTruthy();
    expect(screen.getByLabelText("Headline")).toBeTruthy();
    expect(screen.getByLabelText("Body")).toBeTruthy();
    expect(screen.getByLabelText("Button label")).toBeTruthy();
    expect(screen.getByLabelText("Button destination URL")).toBeTruthy();

    expect(screen.queryByLabelText(/footer/i)).toBeNull();
    expect(screen.queryByLabelText("Event details")).toBeNull();
    expect(screen.queryByLabelText("Offer details")).toBeNull();
    expect(screen.queryByLabelText("Image description")).toBeNull();
  });

  it("disables the save button while a save is pending", async () => {
    let resolveFetch: (value: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );

    render(<EditDraftPanel campaignId="campaign-1" document={baseDocument} />);
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "New subject" } });

    const saveButton = screen.getByRole("button", { name: "Save edit" });
    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Saving version…" })).toBeTruthy(),
    );
    expect(screen.getByRole("button", { name: "Saving version…" })).toHaveProperty(
      "disabled",
      true,
    );

    resolveFetch(new Response(JSON.stringify({ documentId: "doc-2", version: 3 }), { status: 201 }));
  });

  it("navigates to the new version and reports success on 201", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ documentId: "doc-2", version: 3 }), { status: 201 }),
      ),
    );

    render(<EditDraftPanel campaignId="campaign-1" document={baseDocument} />);
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "New subject" } });
    fireEvent.click(screen.getByRole("button", { name: "Save edit" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/campaigns/campaign-1/preview?version=3&created=1"));
  });

  it("shows a conflict message and reload-latest action on 409", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Newer version exists.", latestVersion: 5 }), {
          status: 409,
        }),
      ),
    );

    render(<EditDraftPanel campaignId="campaign-1" document={baseDocument} />);
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "New subject" } });
    fireEvent.click(screen.getByRole("button", { name: "Save edit" }));

    await waitFor(() => expect(screen.getByText(/v5/)).toBeTruthy());
    expect(screen.getByRole("button", { name: "Reload latest version" })).toBeTruthy();
    // User input must be preserved, not cleared.
    expect((screen.getByLabelText("Subject") as HTMLInputElement).value).toBe("New subject");
  });

  it("shows a regenerate button for each eligible field but not for CTA or footer", () => {
    render(<EditDraftPanel campaignId="campaign-1" document={baseDocument} />);

    expect(screen.getByRole("button", { name: "Regenerate headline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Regenerate body" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /regenerate.*cta/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /regenerate.*footer/i })).toBeNull();
  });

  it("navigates to the new version on a successful regenerate", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ documentId: "doc-2", version: 3 }), { status: 201 }),
      ),
    );

    render(<EditDraftPanel campaignId="campaign-1" document={baseDocument} />);
    fireEvent.click(screen.getByRole("button", { name: "Regenerate body" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/campaigns/campaign-1/preview?version=3&created=1"));
  });

  it("shows a regenerate error without navigating on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Couldn't regenerate this block. Try again." }), {
          status: 502,
        }),
      ),
    );

    render(<EditDraftPanel campaignId="campaign-1" document={baseDocument} />);
    fireEvent.click(screen.getByRole("button", { name: "Regenerate body" }));

    await waitFor(() =>
      expect(screen.getByText("Couldn't regenerate this block. Try again.")).toBeTruthy(),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("preserves entered values and shows a safe error on a 400 validation failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "The CTA URL must be a valid http or https address." }), {
          status: 400,
        }),
      ),
    );

    render(<EditDraftPanel campaignId="campaign-1" document={baseDocument} />);
    fireEvent.change(screen.getByLabelText("Button destination URL"), {
      target: { value: "javascript:alert(1)" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save edit" }));

    await waitFor(() =>
      expect(
        screen.getByText("The CTA URL must be a valid http or https address."),
      ).toBeTruthy(),
    );
    expect((screen.getByLabelText("Button destination URL") as HTMLInputElement).value).toBe(
      "javascript:alert(1)",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("shows a Replace image control only when the layout has an image slot", () => {
    render(<EditDraftPanel campaignId="campaign-1" document={baseDocument} />);
    expect(screen.queryByLabelText("Replace image")).toBeNull();

    render(<EditDraftPanel campaignId="campaign-1" document={imageDocument} />);
    expect(screen.getByLabelText("Replace image")).toBeTruthy();
  });

  it("uploads the file and navigates to the new version on a successful replace", async () => {
    uploadAssetMock.mockResolvedValue({ id: "asset-new" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ documentId: "doc-2", version: 3 }), { status: 201 }),
      ),
    );

    render(<EditDraftPanel campaignId="campaign-1" document={imageDocument} />);
    const file = new File(["fake"], "new-hero.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Replace image"), { target: { files: [file] } });

    await waitFor(() => expect(push).toHaveBeenCalledWith("/campaigns/campaign-1/preview?version=3&created=1"));
    expect(uploadAssetMock).toHaveBeenCalledWith(file, "campaign_image");
  });

  it("shows an error without navigating when replace-image fails", async () => {
    uploadAssetMock.mockResolvedValue({ id: "asset-new" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "This is already the current image." }), {
          status: 400,
        }),
      ),
    );

    render(<EditDraftPanel campaignId="campaign-1" document={imageDocument} />);
    const file = new File(["fake"], "new-hero.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Replace image"), { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByText("This is already the current image.")).toBeTruthy(),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("shows a conflict message without navigating on a 409 during replace-image", async () => {
    uploadAssetMock.mockResolvedValue({ id: "asset-new" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Newer version exists.", latestVersion: 5 }), {
          status: 409,
        }),
      ),
    );

    render(<EditDraftPanel campaignId="campaign-1" document={imageDocument} />);
    const file = new File(["fake"], "new-hero.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Replace image"), { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText(/v5/)).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
  });
});
