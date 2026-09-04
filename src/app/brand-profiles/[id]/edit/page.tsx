import Link from "next/link";

import { getBrandProfileById } from "@/app/brand-profiles/actions";

import { EditBrandProfileClient } from "./edit-client";

export const dynamic = "force-dynamic";

export default async function EditBrandProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getBrandProfileById(id);

  if (!profile) {
    return (
      <div className="page-shell">
        <div className="not-found-note">
          <h1>Brand profile not found</h1>
          <p>This profile may no longer exist.</p>
          <Link className="text-link" href="/brand-profiles">
            Return to brand profiles
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <EditBrandProfileClient profile={profile} />
    </div>
  );
}
