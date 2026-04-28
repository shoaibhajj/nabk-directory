"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

/**
 * Local slug derivation — matches the `slugifyBase` helper in `lib/slug.ts`
 * but without the listing-uniqueness loop (countries/cities use a single
 * unique constraint that the DB enforces). Strips diacritics, lowercases,
 * and collapses non-ascii to dashes so an Arabic-only nameEn fallback
 * produces an empty string and we surface a friendly validation error
 * instead of writing an empty slug.
 */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Countries and cities are global product taxonomy that affect every public
 * directory page. Restrict CRUD to SUPER_ADMIN to keep the blast radius
 * small — accidental rename/delete by a regular admin would cascade to the
 * URL of every business.
 */
async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return null;
  }
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    role: session.user.role,
  };
}

// Slug rules: short, ASCII-or-Arabic, dashes only — keeps URLs sane in both
// directions. We auto-derive from `nameEn` when the user leaves it blank,
// then re-validate so an empty fallback (e.g. all non-ASCII English name)
// fails fast instead of producing an empty slug.
const slugField = z
  .string()
  .trim()
  .min(2, "المعرّف قصير جداً")
  .max(60, "المعرّف طويل جداً")
  .regex(/^[a-z0-9-]+$/, "المعرّف يقبل أحرفاً لاتينية صغيرة وأرقاماً وشرطات فقط");

const baseFields = {
  nameAr: z.string().trim().min(2, "الاسم العربي قصير جداً").max(80),
  nameEn: z.string().trim().min(2, "الاسم الإنجليزي قصير جداً").max(80),
  slug: z.string().trim().max(60).optional(),
  isActive: z.boolean().optional().default(true),
};

const createCountrySchema = z.object(baseFields);
const updateCountrySchema = z.object({ id: z.string().min(1), ...baseFields });

const createCitySchema = z.object({
  ...baseFields,
  countryId: z.string().min(1, "اختر البلد"),
});
const updateCitySchema = z.object({
  id: z.string().min(1),
  countryId: z.string().min(1, "اختر البلد"),
  ...baseFields,
});

function resolveSlug(provided: string | undefined, nameEn: string) {
  const candidate = (provided ?? "").trim() || slugify(nameEn);
  return candidate;
}

function isUniqueViolation(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Country CRUD
// ──────────────────────────────────────────────────────────────────────────

export async function createCountryAction(input: {
  nameAr: string;
  nameEn: string;
  slug?: string;
  isActive?: boolean;
}): Promise<ActionResult> {
  const actor = await requireSuperAdmin();
  if (!actor) return { ok: false, error: "غير مسموح." };

  const rl = await withRateLimit(`places-create:${actor.id}`, 60, 60 * 60 * 1000);
  if (!rl.ok) return { ok: false, error: "تجاوزت الحد المسموح." };

  const parsed = createCountrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة.",
    };
  }
  const slug = resolveSlug(parsed.data.slug, parsed.data.nameEn);
  const slugCheck = slugField.safeParse(slug);
  if (!slugCheck.success) {
    return { ok: false, error: slugCheck.error.issues[0]?.message ?? "معرّف غير صالح." };
  }

  try {
    const created = await prisma.country.create({
      data: {
        nameAr: parsed.data.nameAr,
        nameEn: parsed.data.nameEn,
        slug,
        isActive: parsed.data.isActive ?? true,
      },
      select: { id: true },
    });
    await recordAudit({
      actor,
      action: "COUNTRY_CREATED",
      entityType: "Country",
      entityId: created.id,
      after: { nameAr: parsed.data.nameAr, slug },
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { ok: false, error: "المعرّف مستخدم لبلد آخر." };
    }
    console.error("[createCountryAction]", e);
    return { ok: false, error: "تعذّر إنشاء البلد." };
  }

  revalidatePath("/admin/places");
  revalidatePath("/admin/places/countries");
  revalidatePath("/admin/places/cities");
  return { ok: true };
}

export async function updateCountryAction(input: {
  id: string;
  nameAr: string;
  nameEn: string;
  slug?: string;
  isActive?: boolean;
}): Promise<ActionResult> {
  const actor = await requireSuperAdmin();
  if (!actor) return { ok: false, error: "غير مسموح." };

  const rl = await withRateLimit(`places-update:${actor.id}`, 120, 60 * 60 * 1000);
  if (!rl.ok) return { ok: false, error: "تجاوزت الحد المسموح." };

  const parsed = updateCountrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة.",
    };
  }
  const slug = resolveSlug(parsed.data.slug, parsed.data.nameEn);
  const slugCheck = slugField.safeParse(slug);
  if (!slugCheck.success) {
    return { ok: false, error: slugCheck.error.issues[0]?.message ?? "معرّف غير صالح." };
  }

  const before = await prisma.country.findUnique({
    where: { id: parsed.data.id },
    select: { nameAr: true, nameEn: true, slug: true, isActive: true },
  });
  if (!before) return { ok: false, error: "البلد غير موجود." };

  try {
    await prisma.country.update({
      where: { id: parsed.data.id },
      data: {
        nameAr: parsed.data.nameAr,
        nameEn: parsed.data.nameEn,
        slug,
        isActive: parsed.data.isActive ?? before.isActive,
      },
    });
    await recordAudit({
      actor,
      action: "COUNTRY_UPDATED",
      entityType: "Country",
      entityId: parsed.data.id,
      before,
      after: {
        nameAr: parsed.data.nameAr,
        nameEn: parsed.data.nameEn,
        slug,
        isActive: parsed.data.isActive ?? before.isActive,
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { ok: false, error: "المعرّف مستخدم لبلد آخر." };
    }
    console.error("[updateCountryAction]", e);
    return { ok: false, error: "تعذّر تحديث البلد." };
  }

  revalidatePath("/admin/places");
  revalidatePath("/admin/places/countries");
  revalidatePath("/admin/places/cities");
  return { ok: true };
}

export async function deleteCountryAction(id: string): Promise<ActionResult> {
  const actor = await requireSuperAdmin();
  if (!actor) return { ok: false, error: "غير مسموح." };

  // Guard: refuse to delete a country that still has any city. The City→
  // Country FK is `onDelete` (default Restrict), so the DB would also stop
  // us, but checking up front lets us return a friendly Arabic message
  // instead of a Prisma error.
  const country = await prisma.country.findUnique({
    where: { id },
    select: { id: true, nameAr: true, _count: { select: { cities: true } } },
  });
  if (!country) return { ok: false, error: "البلد غير موجود." };
  if (country._count.cities > 0) {
    return {
      ok: false,
      error: `لا يمكن حذف «${country.nameAr}» لأنه يحتوي على ${country._count.cities} مدينة. احذف المدن أولاً أو انقلها إلى بلد آخر.`,
    };
  }

  // Even after the upfront city-count check, a city may be inserted between
  // the SELECT and the DELETE. We catch FK violations (P2003) and the
  // generic "record not found" (P2025) here so the user sees a friendly
  // Arabic message instead of a 500.
  try {
    await prisma.country.delete({ where: { id } });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2003"
    ) {
      return {
        ok: false,
        error: `لا يمكن حذف «${country.nameAr}» لأنه ما زال مرتبطاً بمدن. احذف المدن أولاً.`,
      };
    }
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      return { ok: false, error: "البلد لم يعد موجوداً." };
    }
    console.error("[deleteCountryAction]", e);
    return { ok: false, error: "تعذّر حذف البلد." };
  }

  await recordAudit({
    actor,
    action: "COUNTRY_DELETED",
    entityType: "Country",
    entityId: id,
    before: { nameAr: country.nameAr },
  });

  revalidatePath("/admin/places");
  revalidatePath("/admin/places/countries");
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────────
// City CRUD
// ──────────────────────────────────────────────────────────────────────────

export async function createCityAction(input: {
  countryId: string;
  nameAr: string;
  nameEn: string;
  slug?: string;
  isActive?: boolean;
}): Promise<ActionResult> {
  const actor = await requireSuperAdmin();
  if (!actor) return { ok: false, error: "غير مسموح." };

  const rl = await withRateLimit(`places-create:${actor.id}`, 60, 60 * 60 * 1000);
  if (!rl.ok) return { ok: false, error: "تجاوزت الحد المسموح." };

  const parsed = createCitySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة.",
    };
  }
  const slug = resolveSlug(parsed.data.slug, parsed.data.nameEn);
  const slugCheck = slugField.safeParse(slug);
  if (!slugCheck.success) {
    return { ok: false, error: slugCheck.error.issues[0]?.message ?? "معرّف غير صالح." };
  }

  const country = await prisma.country.findUnique({
    where: { id: parsed.data.countryId },
    select: { id: true },
  });
  if (!country) return { ok: false, error: "البلد غير موجود." };

  try {
    const created = await prisma.city.create({
      data: {
        countryId: parsed.data.countryId,
        nameAr: parsed.data.nameAr,
        nameEn: parsed.data.nameEn,
        slug,
        isActive: parsed.data.isActive ?? true,
      },
      select: { id: true },
    });
    await recordAudit({
      actor,
      action: "CITY_CREATED",
      entityType: "City",
      entityId: created.id,
      after: {
        countryId: parsed.data.countryId,
        nameAr: parsed.data.nameAr,
        slug,
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { ok: false, error: "المعرّف مستخدم لمدينة أخرى." };
    }
    console.error("[createCityAction]", e);
    return { ok: false, error: "تعذّر إنشاء المدينة." };
  }

  revalidatePath("/admin/places");
  revalidatePath("/admin/places/cities");
  return { ok: true };
}

export async function updateCityAction(input: {
  id: string;
  countryId: string;
  nameAr: string;
  nameEn: string;
  slug?: string;
  isActive?: boolean;
}): Promise<ActionResult> {
  const actor = await requireSuperAdmin();
  if (!actor) return { ok: false, error: "غير مسموح." };

  const rl = await withRateLimit(`places-update:${actor.id}`, 120, 60 * 60 * 1000);
  if (!rl.ok) return { ok: false, error: "تجاوزت الحد المسموح." };

  const parsed = updateCitySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة.",
    };
  }
  const slug = resolveSlug(parsed.data.slug, parsed.data.nameEn);
  const slugCheck = slugField.safeParse(slug);
  if (!slugCheck.success) {
    return { ok: false, error: slugCheck.error.issues[0]?.message ?? "معرّف غير صالح." };
  }

  const [before, country] = await Promise.all([
    prisma.city.findUnique({
      where: { id: parsed.data.id },
      select: {
        nameAr: true,
        nameEn: true,
        slug: true,
        isActive: true,
        countryId: true,
      },
    }),
    prisma.country.findUnique({
      where: { id: parsed.data.countryId },
      select: { id: true },
    }),
  ]);
  if (!before) return { ok: false, error: "المدينة غير موجودة." };
  if (!country) return { ok: false, error: "البلد غير موجود." };

  try {
    await prisma.city.update({
      where: { id: parsed.data.id },
      data: {
        countryId: parsed.data.countryId,
        nameAr: parsed.data.nameAr,
        nameEn: parsed.data.nameEn,
        slug,
        isActive: parsed.data.isActive ?? before.isActive,
      },
    });
    await recordAudit({
      actor,
      action: "CITY_UPDATED",
      entityType: "City",
      entityId: parsed.data.id,
      before,
      after: {
        countryId: parsed.data.countryId,
        nameAr: parsed.data.nameAr,
        nameEn: parsed.data.nameEn,
        slug,
        isActive: parsed.data.isActive ?? before.isActive,
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { ok: false, error: "المعرّف مستخدم لمدينة أخرى." };
    }
    console.error("[updateCityAction]", e);
    return { ok: false, error: "تعذّر تحديث المدينة." };
  }

  revalidatePath("/admin/places");
  revalidatePath("/admin/places/cities");
  return { ok: true };
}

export async function deleteCityAction(id: string): Promise<ActionResult> {
  const actor = await requireSuperAdmin();
  if (!actor) return { ok: false, error: "غير مسموح." };

  // Guard: refuse to delete a city with active business listings. We count
  // listings excluding soft-deleted ones — a soft-deleted listing still has
  // its FK and would also block the cascade, but the user-facing reason
  // matters: "the city has X businesses" is what an admin can act on.
  const city = await prisma.city.findUnique({
    where: { id },
    select: {
      id: true,
      nameAr: true,
      _count: {
        select: { listings: { where: { deletedAt: null } } },
      },
    },
  });
  if (!city) return { ok: false, error: "المدينة غير موجودة." };
  if (city._count.listings > 0) {
    return {
      ok: false,
      error: `لا يمكن حذف «${city.nameAr}» لأنها تحتوي على ${city._count.listings} عمل. انقل الأعمال إلى مدينة أخرى أولاً.`,
    };
  }

  try {
    await prisma.city.delete({ where: { id } });
  } catch (e) {
    console.error("[deleteCityAction]", e);
    return {
      ok: false,
      error: "تعذّر حذف المدينة. قد تكون مرتبطة بأعمال أخرى.",
    };
  }
  await recordAudit({
    actor,
    action: "CITY_DELETED",
    entityType: "City",
    entityId: id,
    before: { nameAr: city.nameAr },
  });

  revalidatePath("/admin/places");
  revalidatePath("/admin/places/cities");
  return { ok: true };
}
