"use client";

import { useState } from "react";

import { buildEmailDownloadFilename } from "@/lib/campaign-slug";

type ViewMode = "desktop" | "mobile";

type PreviewShellProps = {
  renderedHtml: string;
  plainText: string;
  campaignName: string;
  documentVersion: number;
};

export function PreviewShell({
  renderedHtml,
  plainText,
  campaignName,
  documentVersion,
}: PreviewShellProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [plainTextOpen, setPlainTextOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleCopy() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(renderedHtml);
      setCopyStatus("success");
    } catch {
      setCopyStatus("error");
    }
  }

  function handleDownload() {
    setDownloadError(null);
    try {
      const blob = new Blob([renderedHtml], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = buildEmailDownloadFilename(campaignName, documentVersion);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("Couldn't download HTML. Please try again.");
    }
  }

  return (
    <div className="preview-shell">
      <div className="preview-toolbar">
        <div className="preview-mode-toggle" role="radiogroup" aria-label="Preview width">
          <button
            aria-pressed={viewMode === "desktop"}
            className={viewMode === "desktop" ? "selected" : ""}
            onClick={() => setViewMode("desktop")}
            type="button"
          >
            Desktop
          </button>
          <button
            aria-pressed={viewMode === "mobile"}
            className={viewMode === "mobile" ? "selected" : ""}
            onClick={() => setViewMode("mobile")}
            type="button"
          >
            Mobile
          </button>
        </div>

        <div className="preview-actions">
          <button className="button" onClick={handleCopy} type="button">
            Copy HTML
          </button>
          <button className="button primary" onClick={handleDownload} type="button">
            Download HTML
          </button>
        </div>
      </div>

      {copyStatus === "success" ? <p className="field-hint">HTML copied.</p> : null}
      {copyStatus === "error" ? (
        <p className="form-error">Couldn&apos;t copy HTML. Please try again.</p>
      ) : null}
      {downloadError ? <p className="form-error">{downloadError}</p> : null}

      <div className={`email-frame-container email-frame-${viewMode}`}>
        <iframe
          className="email-frame"
          sandbox=""
          srcDoc={renderedHtml}
          title="Email preview"
        />
      </div>

      <details
        className="more-details"
        onToggle={(event) => setPlainTextOpen((event.target as HTMLDetailsElement).open)}
        open={plainTextOpen}
      >
        <summary>View plain text</summary>
        <pre className="plain-text-view">{plainText}</pre>
      </details>
    </div>
  );
}
