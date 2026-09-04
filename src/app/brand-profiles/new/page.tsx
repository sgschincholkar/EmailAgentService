"use client";

import { useRouter } from "next/navigation";

import { BrandProfileForm } from "@/components/brand-profile/brand-profile-form";

import { saveBrandProfile } from "../actions";

export default function NewBrandProfilePage() {
  const router = useRouter();

  return (
    <div className="page-shell">
      <BrandProfileForm
        onSave={async (profile) => {
          await saveBrandProfile(profile);
          router.push("/brand-profiles");
        }}
      />
    </div>
  );
}
