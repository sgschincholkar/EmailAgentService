import Link from "next/link";

import { listBrandProfiles } from "@/app/brand-profiles/actions";
import { CampaignFormClient } from "@/components/campaign/campaign-form-client";
import { GenerateButton } from "@/components/campaign/generate-button";

import { getCampaignById, getLatestGeneratedEmailDocument, listAssetsByIds } from "../actions";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [campaign, brandProfiles] = await Promise.all([
    getCampaignById(id),
    listBrandProfiles(),
  ]);

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

  const unorderedImages = await listAssetsByIds(campaign.assetIds);
  const images = campaign.assetIds
    .map((assetId) => unorderedImages.find((asset) => asset.id === assetId))
    .filter((asset) => asset !== undefined);

  const generatedDocument = await getLatestGeneratedEmailDocument(campaign.id);

  return (
    <div className="page-shell">
      <GenerateButton campaignId={campaign.id} status={campaign.status} />
      {generatedDocument ? (
        <Link className="text-link" href={`/campaigns/${campaign.id}/preview`}>
          View generated draft
        </Link>
      ) : null}
      <CampaignFormClient
        brandProfiles={brandProfiles}
        initialCampaign={campaign}
        initialImages={images}
      />
    </div>
  );
}
