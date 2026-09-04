import Link from "next/link";

import type { BrandProfile } from "@/domain/schemas";

export function BrandProfileList({ profiles }: { profiles: BrandProfile[] }) {
  if (profiles.length === 0) {
    return (
      <section className="empty-state">
        <p className="eyebrow">Your first step</p>
        <h1>Make it feel like your brand</h1>
        <p>
          Add the essentials once, then use them as the starting point for every
          campaign draft.
        </p>
        <Link className="button primary" href="/brand-profiles/new">
          Create brand profile
        </Link>
      </section>
    );
  }

  return (
    <div className="profile-grid">
      {profiles.map((profile) => (
        <article className="profile-card" key={profile.id}>
          <div
            aria-hidden="true"
            className="color-dot"
            style={{ backgroundColor: profile.colors.primary }}
          />
          <div>
            <h2>{profile.name}</h2>
            <p>{profile.tone.join(" · ")}</p>
          </div>
          <Link
            aria-label={`Edit ${profile.name}`}
            className="text-link"
            href={`/brand-profiles/${profile.id}/edit`}
          >
            Edit
          </Link>
        </article>
      ))}
    </div>
  );
}
