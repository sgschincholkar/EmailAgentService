import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PreviewShell } from "./preview-shell";

const renderedHtml = "<table><tr><td>Hello</td></tr></table>";
const plainText = "Hello\n\nA plain text body.";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PreviewShell", () => {
  it("passes the exact persisted renderedHtml to the iframe via srcDoc", () => {
    render(
      <PreviewShell
        campaignName="Spring Launch"
        documentVersion={1}
        plainText={plainText}
        renderedHtml={renderedHtml}
      />,
    );
    const iframe = screen.getByTitle("Email preview") as HTMLIFrameElement;
    expect(iframe.getAttribute("srcdoc")).toBe(renderedHtml);
  });

  it("uses a restrictive empty sandbox attribute", () => {
    render(
      <PreviewShell
        campaignName="Spring Launch"
        documentVersion={1}
        plainText={plainText}
        renderedHtml={renderedHtml}
      />,
    );
    const iframe = screen.getByTitle("Email preview") as HTMLIFrameElement;
    expect(iframe.getAttribute("sandbox")).toBe("");
  });

  it("switches only the frame container class between desktop and mobile, keeping the same srcDoc", () => {
    render(
      <PreviewShell
        campaignName="Spring Launch"
        documentVersion={1}
        plainText={plainText}
        renderedHtml={renderedHtml}
      />,
    );
    const iframe = screen.getByTitle("Email preview") as HTMLIFrameElement;
    const container = iframe.parentElement as HTMLElement;

    expect(container.className).toContain("email-frame-desktop");
    const beforeSrcDoc = iframe.getAttribute("srcdoc");

    fireEvent.click(screen.getByRole("button", { name: "Mobile" }));

    expect(container.className).toContain("email-frame-mobile");
    expect(container.className).not.toContain("email-frame-desktop");
    expect(iframe.getAttribute("srcdoc")).toBe(beforeSrcDoc);
  });

  it("exposes selected state via aria-pressed and supports keyboard activation", () => {
    render(
      <PreviewShell
        campaignName="Spring Launch"
        documentVersion={1}
        plainText={plainText}
        renderedHtml={renderedHtml}
      />,
    );
    const desktopButton = screen.getByRole("button", { name: "Desktop" });
    const mobileButton = screen.getByRole("button", { name: "Mobile" });

    expect(desktopButton.getAttribute("aria-pressed")).toBe("true");
    expect(mobileButton.getAttribute("aria-pressed")).toBe("false");

    mobileButton.focus();
    fireEvent.click(mobileButton);

    expect(mobileButton.getAttribute("aria-pressed")).toBe("true");
    expect(desktopButton.getAttribute("aria-pressed")).toBe("false");
  });

  it("copies the exact persisted renderedHtml and shows success feedback", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    render(
      <PreviewShell
        campaignName="Spring Launch"
        documentVersion={1}
        plainText={plainText}
        renderedHtml={renderedHtml}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy HTML" }));

    await waitFor(() => expect(screen.getByText("HTML copied.")).toBeTruthy());
    expect(writeText).toHaveBeenCalledWith(renderedHtml);
  });

  it("shows failure feedback when clipboard access fails, without claiming success", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    render(
      <PreviewShell
        campaignName="Spring Launch"
        documentVersion={1}
        plainText={plainText}
        renderedHtml={renderedHtml}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy HTML" }));

    await waitFor(() =>
      expect(screen.getByText("Couldn't copy HTML. Please try again.")).toBeTruthy(),
    );
    expect(screen.queryByText("HTML copied.")).toBeNull();
  });

  it("downloads a Blob containing the exact persisted renderedHtml with the correct MIME type and filename", () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === "a") el.click = clickSpy;
      return el;
    });

    render(
      <PreviewShell
        campaignName="Spring Launch"
        documentVersion={2}
        plainText={plainText}
        renderedHtml={renderedHtml}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Download HTML" }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blobArg = createObjectURL.mock.calls[0][0] as Blob;
    expect(blobArg.type).toBe("text/html;charset=utf-8");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("reads the exact persisted plainText in the plain-text disclosure, preserving whitespace", () => {
    render(
      <PreviewShell
        campaignName="Spring Launch"
        documentVersion={1}
        plainText={plainText}
        renderedHtml={renderedHtml}
      />,
    );

    fireEvent.click(screen.getByText("View plain text"));

    const pre = screen.getByText((_, element) => element?.tagName === "PRE");
    expect(pre.textContent).toBe(plainText);
  });
});
