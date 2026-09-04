"use client";

import { useRouter } from "next/navigation";

import { BrandProfileForm } from "@/components/brand-profile/brand-profile-form";
import type { BrandProfile } from "@/domain/schemas";

import { saveBrandProfile } from "../../actions";

export function EditBrandProfileClient({ profile }: { profile: BrandProfile }) {
  const router = useRouter();

  return (
    <BrandProfileForm
      initialProfile={profile}
      onSave={async (updatedProfile) => {
        await saveBrandProfile(updatedProfile);
        router.push("/brand-profiles");
      }}
    />
  );
}
