"use server";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { brandProfileRowToDomain } from "@/db/mappers";
import { brandProfiles } from "@/db/schema";
import { BrandProfileSchema, type BrandProfile } from "@/domain/schemas";

export type BrandProfileFormInput = Omit<
  BrandProfile,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};

export async function listBrandProfiles(): Promise<BrandProfile[]> {
  const rows = await db.select().from(brandProfiles);
  return rows.map(brandProfileRowToDomain);
}

export async function getBrandProfileById(
  id: string,
): Promise<BrandProfile | undefined> {
  const [row] = await db
    .select()
    .from(brandProfiles)
    .where(eq(brandProfiles.id, id));
  return row ? brandProfileRowToDomain(row) : undefined;
}

export async function saveBrandProfile(
  input: BrandProfileFormInput,
): Promise<BrandProfile> {
  const now = new Date().toISOString();
  const existing = input.id ? await getBrandProfileById(input.id) : undefined;

  const candidate = BrandProfileSchema.parse({
    ...input,
    id: input.id ?? crypto.randomUUID(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  } as BrandProfile);

  const values = {
    name: candidate.name,
    logoAssetId: candidate.logoAssetId ?? null,
    colorsPrimary: candidate.colors.primary,
    colorsSecondary: candidate.colors.secondary ?? null,
    colorsAccent: candidate.colors.accent ?? null,
    colorsBackground: candidate.colors.background ?? null,
    colorsText: candidate.colors.text ?? null,
    preferredFont: candidate.preferredFont ?? null,
    emailFontStack: candidate.emailFontStack,
    tone: candidate.tone,
    voiceNotes: candidate.voiceNotes ?? null,
    preferredTerms: candidate.preferredTerms,
    prohibitedTerms: candidate.prohibitedTerms,
    defaultCtaStyle: candidate.defaultCtaStyle,
    defaultFooterHtml: candidate.defaultFooterHtml,
    updatedAt: new Date(),
  };

  if (existing) {
    const [row] = await db
      .update(brandProfiles)
      .set(values)
      .where(eq(brandProfiles.id, candidate.id))
      .returning();
    if (!row) throw new Error("Brand profile not found.");
    return brandProfileRowToDomain(row);
  }

  const [row] = await db
    .insert(brandProfiles)
    .values({ ...values, id: candidate.id })
    .returning();
  return brandProfileRowToDomain(row);
}
