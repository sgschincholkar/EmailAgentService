import Link from "next/link";

import { listBrandProfiles } from "@/app/brand-profiles/actions";
import { CampaignFormClient } from "@/components/campaign/campaign-form-client";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  const brandProfiles = await listBrandProfiles();

  if (brandProfiles.length === 0) {
    return (
      <div className="page-shell">
        <div className="not-found-note">
          <h1>Create a brand profile first</h1>
          <p>Campaigns need a brand profile to draw colors, tone, and voice from.</p>
          <Link className="text-link" href="/brand-profiles/new">
            Create a brand profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <CampaignFormClient brandProfiles={brandProfiles} />
    </div>
  );
}
