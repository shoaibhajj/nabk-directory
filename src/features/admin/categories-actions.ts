"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { recordAudit, type AuditActor } from "@/lib/audit";
import { generateUniqueCategorySlug } from "@/lib/slug";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin(): Promise<AuditActor | null> {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    return null;
  }
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    role: role ?? null,
  };
}

const baseCategorySchema = z.object({
  nameAr: z.string().trim().min(2, "الاسم بالعربية مطلوب").max(80),
  nameEn: z
    .string()
    .trim()
    .min(2, "الاسم بالإنجليزية مطلوب")
    .max(80)
    .regex(/^[A-Za-z0-9 \-_/&]+$/, "أحرف إنجليزية فقط"),
  parentId: z
    .string()
    .min(1)
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  icon: z
    .string()
    .trim()
    .max(40)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
  displayOrder: z.coerce.number().int().min(0).max(9_999).default(0),
  isActive: z.coerce.boolean().default(true),
});

const createSchema = baseCategorySchema;
const updateSchema = baseCategorySchema.extend({
  id: z.string().min(1),
});
const deleteSchema = z.object({ id: z.string().min(1) });

export async function adminCreateCategoryAction(
  input: z.infer<typeof createSchema>,
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor || !actor.id) return { ok: false, error: "غير مسموح." };

  const rl = await withRateLimit(
    `admin-category-create:${actor.id}`,
    60,
    60 * 60 * 1000,
  );
  if (!rl.ok) return { ok: false, error: "تجاوزت الحد المسموح." };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة.",
    };
  }

  // The parent (if any) must exist and itself be a top-level category — we
  // cap the tree at one level of nesting so the navigation doesn't sprawl.
  if (parsed.data.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: parsed.data.parentId },
      select: { id: true, parentId: true },
    });
    if (!parent) return { ok: false, error: "التصنيف الرئيسي غير موجود." };
    if (parent.parentId) {
      return { ok: false, error: "لا يمكن التداخل لأكثر من مستويين." };
    }
  }

  const slug = await generateUniqueCategorySlug(parsed.data.nameEn, parsed.data.nameAr);

  const created = await prisma.category.create({
    data: {
      nameAr: parsed.data.nameAr,
      nameEn: parsed.data.nameEn,
      slug,
      icon: parsed.data.icon,
      parentId: parsed.data.parentId,
      displayOrder: parsed.data.displayOrder,
      isActive: parsed.data.isActive,
    },
    select: { id: true, slug: true, nameAr: true, nameEn: true },
  });

  await recordAudit({
    actor,
    action: "CATEGORY_CREATED",
    entityType: "Category",
    entityId: created.id,
    after: created,
  });

  revalidatePath("/admin/categories");
  revalidatePath("/categories");
  revalidatePath("/");
  return { ok: true };
}

export async function adminUpdateCategoryAction(
  input: z.infer<typeof updateSchema>,
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor || !actor.id) return { ok: false, error: "غير مسموح." };

  const rl = await withRateLimit(
    `admin-category-update:${actor.id}`,
    120,
    60 * 60 * 1000,
  );
  if (!rl.ok) return { ok: false, error: "تجاوزت الحد المسموح." };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة.",
    };
  }

  const existing = await prisma.category.findUnique({
    where: { id: parsed.data.id },
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
      slug: true,
      icon: true,
      parentId: true,
      displayOrder: true,
      isActive: true,
    },
  });
  if (!existing) return { ok: false, error: "التصنيف غير موجود." };

  if (parsed.data.parentId === parsed.data.id) {
    return { ok: false, error: "لا يمكن أن يكون التصنيف أباً لنفسه." };
  }
  if (parsed.data.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: parsed.data.parentId },
      select: { id: true, parentId: true },
    });
    if (!parent) return { ok: false, error: "التصنيف الرئيسي غير موجود." };
    if (parent.parentId) {
      return { ok: false, error: "لا يمكن التداخل لأكثر من مستويين." };
    }
  }

  // Re-issue the slug only when the English name actually changed so we
  // don't break inbound /category/<slug> bookmarks on every save.
  let nextSlug = existing.slug;
  if (parsed.data.nameEn !== existing.nameEn) {
    nextSlug = await generateUniqueCategorySlug(
      parsed.data.nameEn,
      parsed.data.nameAr,
      existing.id,
    );
  }

  const updated = await prisma.category.update({
    where: { id: existing.id },
    data: {
      nameAr: parsed.data.nameAr,
      nameEn: parsed.data.nameEn,
      slug: nextSlug,
      icon: parsed.data.icon,
      parentId: parsed.data.parentId,
      displayOrder: parsed.data.displayOrder,
      isActive: parsed.data.isActive,
    },
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
      slug: true,
      icon: true,
      parentId: true,
      displayOrder: true,
      isActive: true,
    },
  });

  await recordAudit({
    actor,
    action: "CATEGORY_UPDATED",
    entityType: "Category",
    entityId: existing.id,
    before: existing,
    after: updated,
  });

  revalidatePath("/admin/categories");
  revalidatePath("/categories");
  revalidatePath(`/category/${existing.slug}`);
  if (nextSlug !== existing.slug) revalidatePath(`/category/${nextSlug}`);
  revalidatePath("/");
  return { ok: true };
}

export async function adminDeleteCategoryAction(
  input: z.infer<typeof deleteSchema>,
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor || !actor.id) return { ok: false, error: "غير مسموح." };

  const rl = await withRateLimit(
    `admin-category-delete:${actor.id}`,
    30,
    60 * 60 * 1000,
  );
  if (!rl.ok) return { ok: false, error: "تجاوزت الحد المسموح." };

  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات غير صالحة." };

  // Refuse to delete a category that still has listings or sub-categories
  // pointing at it — orphaning rows would corrupt the public navigation
  // and break /category/<slug> pages.
  const [target, listingCount, subCount, subListingCount] = await Promise.all([
    prisma.category.findUnique({
      where: { id: parsed.data.id },
      select: {
        id: true,
        slug: true,
        nameAr: true,
        nameEn: true,
        parentId: true,
        displayOrder: true,
        isActive: true,
      },
    }),
    prisma.businessProfile.count({
      where: { categoryId: parsed.data.id, deletedAt: null },
    }),
    prisma.category.count({ where: { parentId: parsed.data.id } }),
    prisma.businessProfile.count({
      where: { subcategoryId: parsed.data.id, deletedAt: null },
    }),
  ]);
  if (!target) return { ok: false, error: "التصنيف غير موجود." };
  if (listingCount > 0 || subListingCount > 0) {
    return {
      ok: false,
      error: `لا يمكن الحذف — يوجد ${listingCount + subListingCount} عمل يستخدم هذا التصنيف.`,
    };
  }
  if (subCount > 0) {
    return {
      ok: false,
      error: `لا يمكن الحذف — يوجد ${subCount} تصنيف فرعي تابع.`,
    };
  }

  await prisma.category.delete({ where: { id: target.id } });

  await recordAudit({
    actor,
    action: "CATEGORY_DELETED",
    entityType: "Category",
    entityId: target.id,
    before: target,
  });

  revalidatePath("/admin/categories");
  revalidatePath("/categories");
  revalidatePath("/");
  return { ok: true };
}
