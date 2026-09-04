import Link from "next/link";

import { BrandProfileList } from "@/components/brand-profile/brand-profile-list";

import { listBrandProfiles } from "./actions";

export const dynamic = "force-dynamic";

export default async function BrandProfilesPage() {
  const profiles = await listBrandProfiles();

  return (
    <div className="page-shell">
      {profiles.length > 0 ? (
        <header className="page-header">
          <div>
            <p className="eyebrow">Brand profiles</p>
            <h1>Your brands</h1>
            <p>Choose a profile to review its voice and visual essentials.</p>
          </div>
          <Link className="button primary" href="/brand-profiles/new">
            New brand profile
          </Link>
        </header>
      ) : null}

      <BrandProfileList profiles={profiles} />
    </div>
  );
}
