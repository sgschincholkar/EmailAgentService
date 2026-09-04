import Link from "next/link";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-frame">
      <header className="app-header">
        <Link className="wordmark" href="/brand-profiles">
          Email Agent
        </Link>
        <nav aria-label="Primary navigation">
          <Link className="nav-link" href="/brand-profiles">
            Brand profiles
          </Link>
          <Link className="nav-link" href="/campaigns">
            Campaigns
          </Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
