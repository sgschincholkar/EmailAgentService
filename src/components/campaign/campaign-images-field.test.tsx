import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CampaignImagesField, type CampaignImageEntry } from "./campaign-images-field";

function stubUploadResponse(asset: {
  id: string;
  storageKey: string;
}) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => asset,
    }),
  );
}

function stubUploadFailure(error: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error }),
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CampaignImagesField", () => {
  it("shows a thumbnail for each uploaded image and allows removal", () => {
    const value: CampaignImageEntry[] = [
      { assetId: "asset-1", previewUrl: "/api/assets/a.png", altText: "Hero shot" },
    ];
    const onChange = vi.fn();

    render(
      <CampaignImagesField imageRequired={false} onChange={onChange} value={value} />,
    );

    expect(screen.getByAltText("Hero shot")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Remove image" }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("uploads a selected file and adds it to the list", async () => {
    stubUploadResponse({ id: "asset-2", storageKey: "key-2.png" });
    const onChange = vi.fn();

    render(<CampaignImagesField imageRequired={false} onChange={onChange} value={[]} />);

    const file = new File(["bytes"], "photo.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange).toHaveBeenCalledWith([
      { assetId: "asset-2", previewUrl: "/api/assets/key-2.png", altText: "" },
    ]);
  });

  it("shows an upload error message on failure", async () => {
    stubUploadFailure("Images must be 5MB or smaller.");
    const onChange = vi.fn();

    render(<CampaignImagesField imageRequired={false} onChange={onChange} value={[]} />);

    const file = new File(["bytes"], "big.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByText("Images must be 5MB or smaller.")).toBeTruthy(),
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("hides the upload button once 3 images are present", () => {
    const value: CampaignImageEntry[] = [
      { assetId: "a1", previewUrl: "/api/assets/1.png", altText: "" },
      { assetId: "a2", previewUrl: "/api/assets/2.png", altText: "" },
      { assetId: "a3", previewUrl: "/api/assets/3.png", altText: "" },
    ];

    render(<CampaignImagesField imageRequired={false} onChange={vi.fn()} value={value} />);

    expect(screen.queryByRole("button", { name: "Upload image" })).toBeNull();
  });

  it("shows an asterisk on the label when an image is required", () => {
    render(<CampaignImagesField imageRequired onChange={vi.fn()} value={[]} />);
    expect(screen.getByText("Add your images *")).toBeTruthy();
  });
});
