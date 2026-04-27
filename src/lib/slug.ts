import { prisma } from "@/lib/prisma";

function slugifyBase(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

export async function generateUniqueListingSlug(
  nameEn: string | null | undefined,
  nameAr: string,
  excludeId?: string,
): Promise<string> {
  const baseRaw = slugifyBase(nameEn ?? "") || slugifyBase(nameAr);
  const base = baseRaw && baseRaw.length >= 3 ? baseRaw : `listing-${randomSuffix()}`;

  for (let i = 0; i < 6; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const existing = await prisma.businessProfile.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
  }
  return `${base}-${randomSuffix()}`;
}

/**
 * Build a unique slug for a Category, falling back to the Arabic name when
 * no Latin name is provided. Categories are admin-managed so we keep the
 * collision search a touch wider than for listings.
 */
export async function generateUniqueCategorySlug(
  nameEn: string | null | undefined,
  nameAr: string,
  excludeId?: string,
): Promise<string> {
  const baseRaw = slugifyBase(nameEn ?? "") || slugifyBase(nameAr);
  const base = baseRaw && baseRaw.length >= 2 ? baseRaw : `category-${randomSuffix()}`;

  for (let i = 0; i < 8; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const existing = await prisma.category.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
  }
  return `${base}-${randomSuffix()}`;
}
