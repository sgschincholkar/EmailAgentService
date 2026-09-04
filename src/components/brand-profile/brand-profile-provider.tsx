"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { BrandProfile } from "@/domain/schemas";
import {
  loadBrandProfiles,
  upsertBrandProfile,
} from "@/lib/brand-profile-storage";

type BrandProfileContextValue = {
  profiles: BrandProfile[];
  ready: boolean;
  saveProfile: (profile: BrandProfile) => void;
};

const BrandProfileContext = createContext<BrandProfileContextValue | null>(null);

export function BrandProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Hydrate after the first client paint so server and client markup agree.
    const hydrationTask = window.setTimeout(() => {
      setProfiles(loadBrandProfiles());
      setReady(true);
    }, 0);

    return () => window.clearTimeout(hydrationTask);
  }, []);

  const saveProfile = useCallback((profile: BrandProfile) => {
    setProfiles(upsertBrandProfile(profile));
  }, []);

  const value = useMemo(
    () => ({ profiles, ready, saveProfile }),
    [profiles, ready, saveProfile],
  );

  return (
    <BrandProfileContext.Provider value={value}>
      {children}
    </BrandProfileContext.Provider>
  );
}

export function useBrandProfiles() {
  const context = useContext(BrandProfileContext);
  if (!context) {
    throw new Error("useBrandProfiles must be used within BrandProfileProvider");
  }
  return context;
}
