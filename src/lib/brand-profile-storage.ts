import { brandProfileSchema, type BrandProfile } from "@/domain/schemas";
import { z } from "zod";

/**
 * Prototype-only browser persistence for Slice 1A.
 * Slice 1B replaces this adapter with server-side Postgres + Drizzle storage.
 */
export const BRAND_PROFILE_STORAGE_KEY = "email-agent.brand-profiles.v1";

const storedBrandProfilesSchema = z.array(brandProfileSchema);

function browserStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function loadBrandProfiles(
  storage: Storage | null = browserStorage(),
): BrandProfile[] {
  if (!storage) return [];

  const storedValue = storage.getItem(BRAND_PROFILE_STORAGE_KEY);
  if (!storedValue) return [];

  try {
    const result = storedBrandProfilesSchema.safeParse(JSON.parse(storedValue));
    if (result.success) return result.data;
  } catch {
    // Treat malformed JSON like any other invalid prototype value.
  }

  storage.removeItem(BRAND_PROFILE_STORAGE_KEY);
  return [];
}

export function saveBrandProfiles(
  profiles: BrandProfile[],
  storage: Storage | null = browserStorage(),
): BrandProfile[] {
  const validatedProfiles = storedBrandProfilesSchema.parse(profiles);
  storage?.setItem(
    BRAND_PROFILE_STORAGE_KEY,
    JSON.stringify(validatedProfiles),
  );
  return validatedProfiles;
}

export function getBrandProfile(
  id: string,
  storage: Storage | null = browserStorage(),
): BrandProfile | undefined {
  return loadBrandProfiles(storage).find((profile) => profile.id === id);
}

export function upsertBrandProfile(
  profile: BrandProfile,
  storage: Storage | null = browserStorage(),
): BrandProfile[] {
  const validatedProfile = brandProfileSchema.parse(profile);
  const profiles = loadBrandProfiles(storage);
  const existingIndex = profiles.findIndex(
    (candidate) => candidate.id === validatedProfile.id,
  );

  const nextProfiles = [...profiles];
  if (existingIndex === -1) nextProfiles.push(validatedProfile);
  else nextProfiles[existingIndex] = validatedProfile;

  return saveBrandProfiles(nextProfiles, storage);
}
