"use client";

import { useRouter } from "next/navigation";

import {
  saveCampaign,
  type CampaignFormInput,
  type CampaignWithSegment,
} from "@/app/campaigns/actions";
import type { Asset, BrandProfile } from "@/domain/schemas";

import { CampaignForm } from "./campaign-form";

type CampaignFormClientProps = {
  brandProfiles: BrandProfile[];
  initialCampaign?: CampaignWithSegment;
  initialImages?: Asset[];
};

export function CampaignFormClient({
  brandProfiles,
  initialCampaign,
  initialImages,
}: CampaignFormClientProps) {
  const router = useRouter();

  async function handleSave(input: CampaignFormInput) {
    const saved = await saveCampaign(input);
    router.push(`/campaigns/${saved.id}`);
  }

  return (
    <CampaignForm
      brandProfiles={brandProfiles}
      initialCampaign={initialCampaign}
      initialImages={initialImages}
      onSave={handleSave}
    />
  );
}
