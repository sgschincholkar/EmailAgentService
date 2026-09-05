"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-frame">
      <header className="app-header">
        <Link className="wordmark" href="/brand-profiles">
          Email Agent
        </Link>
        <nav aria-label="Primary navigation" className="primary-nav">
          <Link
            aria-current={pathname.startsWith("/brand-profiles") ? "page" : undefined}
            className="nav-link"
            href="/brand-profiles"
          >
            Brand profiles
          </Link>
          <Link
            aria-current={pathname.startsWith("/campaigns") ? "page" : undefined}
            className="nav-link"
            href="/campaigns"
          >
            Campaigns
          </Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
