import Link from "next/link";

import { CampaignList } from "@/components/campaign/campaign-list";
import { listCampaigns } from "./actions";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const campaigns = await listCampaigns();

  return (
    <div className="page-shell">
      {campaigns.length > 0 ? (
        <header className="page-header">
          <div>
            <p className="eyebrow">Campaigns</p>
            <h1>Your campaigns</h1>
          </div>
          <Link className="button primary" href="/campaigns/new">
            New campaign
          </Link>
        </header>
      ) : null}
      <CampaignList campaigns={campaigns} />
    </div>
  );
}
