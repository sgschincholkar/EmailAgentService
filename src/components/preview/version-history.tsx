"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import type { EmailDocumentVersionSummary } from "@/app/campaigns/actions";

type VersionHistoryProps = {
  campaignId: string;
  versions: EmailDocumentVersionSummary[];
  latestVersion: number;
  displayedVersion: number;
};

export function VersionHistory({
  campaignId,
  versions,
  latestVersion,
  displayedVersion,
}: VersionHistoryProps) {
  const router = useRouter();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  async function handleRestore(sourceDocumentId: string) {
    setRestoreError(null);
    setRestoringId(sourceDocumentId);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/email-documents/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceDocumentId, expectedVersion: latestVersion }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setRestoreError(body?.error ?? "Couldn't restore this version. Try again.");
        return;
      }

      router.push(`/campaigns/${campaignId}/preview?version=${body.version}`);
    } catch {
      setRestoreError("Couldn't restore this version. Try again.");
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <section aria-label="Version history" className="version-history">
      <h2>Version history</h2>
      {restoreError ? <p className="form-error">{restoreError}</p> : null}
      <ul className="version-list">
        {versions.map((version) => {
          const isLatest = version.version === latestVersion;
          const isDisplayed = version.version === displayedVersion;
          return (
            <li
              className={`version-entry${isDisplayed ? " version-entry-selected" : ""}`}
              key={version.id}
            >
              <div>
                <span className="version-number">Version {version.version}</span>
                {isLatest ? <span className="version-badge">Current</span> : null}
                <p className="field-hint">{new Date(version.createdAt).toLocaleString()}</p>
              </div>
              <div className="version-actions">
                <Link
                  className="text-link"
                  href={`/campaigns/${campaignId}/preview?version=${version.version}`}
                >
                  View
                </Link>
                {!isLatest ? (
                  <button
                    disabled={restoringId === version.id}
                    onClick={() => handleRestore(version.id)}
                    type="button"
                  >
                    {restoringId === version.id ? "Restoring…" : "Restore as new version"}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
