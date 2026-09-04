import Link from "next/link";

import { LAYOUT_LABELS } from "@/domain/campaign-facts";
import type { Campaign } from "@/domain/schemas";

const statusLabels: Record<Campaign["status"], string> = {
  draft: "Draft",
  generating: "Generating",
  generated: "Generated",
  failed: "Failed",
};

export function CampaignList({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) {
    return (
      <div className="empty-state">
        <h1>No campaigns yet</h1>
        <p>Create your first campaign to get started.</p>
        <Link className="button primary" href="/campaigns/new">
          Create campaign
        </Link>
      </div>
    );
  }

  return (
    <ul className="campaign-list">
      {campaigns.map((campaign) => (
        <li key={campaign.id}>
          <Link className="campaign-card" href={`/campaigns/${campaign.id}`}>
            <div>
              <p className="eyebrow">{LAYOUT_LABELS[campaign.selectedLayoutId]}</p>
              <h2>{campaign.name}</h2>
            </div>
            <span className={`status-badge status-${campaign.status}`}>
              {statusLabels[campaign.status]}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
