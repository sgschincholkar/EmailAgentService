import Link from "next/link";

import { getBrandProfileById } from "@/app/brand-profiles/actions";
import {
  getCampaignById,
  getEmailDocumentByCampaignAndVersion,
  getLatestGeneratedEmailDocument,
  listEmailDocumentVersions,
} from "@/app/campaigns/actions";
import { EditDraftPanel } from "@/components/preview/edit-draft-panel";
import { PreviewShell } from "@/components/preview/preview-shell";
import { QuickChecks } from "@/components/preview/quick-checks";
import { VersionHistory } from "@/components/preview/version-history";
import { LAYOUT_LABELS } from "@/domain/campaign-facts";

export const dynamic = "force-dynamic";

function parseVersionParam(raw: string | string[] | undefined): number | undefined {
  if (typeof raw !== "string") return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

export default async function CampaignPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const { version: versionParam } = await searchParams;
  const campaign = await getCampaignById(id);

  if (!campaign) {
    return (
      <div className="page-shell">
        <div className="not-found-note">
          <h1>Campaign not found</h1>
          <Link className="text-link" href="/campaigns">
            Return to campaigns
          </Link>
        </div>
      </div>
    );
  }

  const requestedVersion = parseVersionParam(versionParam);
  const latestDocument = await getLatestGeneratedEmailDocument(campaign.id);

  // A non-numeric, missing, or unavailable version falls back safely to
  // the latest generated version rather than a hard not-found.
  const document = requestedVersion
    ? ((await getEmailDocumentByCampaignAndVersion(campaign.id, requestedVersion)) ??
      latestDocument)
    : latestDocument;

  if (!document) {
    return (
      <div className="page-shell">
        <div className="not-found-note">
          <h1>No generated draft yet</h1>
          <p>Generate a draft from the campaign page before previewing it.</p>
          <Link className="text-link" href={`/campaigns/${campaign.id}`}>
            Return to campaign
          </Link>
        </div>
      </div>
    );
  }

  if (!document.renderedHtml || !document.plainText) {
    return (
      <div className="page-shell">
        <div className="not-found-note">
          <h1>This draft&apos;s saved content is incomplete</h1>
          <p>Generate a new draft from the campaign page to continue.</p>
          <Link className="text-link" href={`/campaigns/${campaign.id}`}>
            Return to campaign
          </Link>
        </div>
      </div>
    );
  }

  const brandProfile = await getBrandProfileById(campaign.brandProfileId);
  const versions = await listEmailDocumentVersions(campaign.id);
  const latestVersion = latestDocument?.version ?? document.version;
  const isLatest = document.version === latestVersion;

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Generated draft</p>
          <h1>{campaign.name}</h1>
          <p>
            {brandProfile?.name ?? "Unknown brand"} · {LAYOUT_LABELS[document.layoutId]}
          </p>
        </div>
        <Link className="text-link" href={`/campaigns/${campaign.id}`}>
          Back to campaign
        </Link>
      </header>

      {!isLatest ? (
        <p className="field-hint">
          Viewing version {document.version} (read-only). Restore it to make edits.
        </p>
      ) : null}

      <div className="field">
        <span className="field-label">Subject</span>
        <p>{document.subject}</p>
      </div>
      <div className="field">
        <span className="field-label">Preheader</span>
        <p>{document.preheader}</p>
      </div>

      <PreviewShell
        campaignName={campaign.name}
        documentVersion={document.version}
        plainText={document.plainText}
        renderedHtml={document.renderedHtml}
      />

      <QuickChecks validationResults={document.validationResults} />

      {isLatest ? <EditDraftPanel campaignId={campaign.id} document={document} /> : null}

      <VersionHistory
        campaignId={campaign.id}
        displayedVersion={document.version}
        latestVersion={latestVersion}
        versions={versions}
      />
    </div>
  );
}
