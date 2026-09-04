import { NextResponse } from "next/server";

import { getCampaignById, listEmailDocumentVersions } from "@/app/campaigns/actions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: campaignId } = await params;

  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  const versions = await listEmailDocumentVersions(campaignId);
  return NextResponse.json({ versions }, { status: 200 });
}
