"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateUniqueListingSlug } from "@/lib/slug";
import { recordAudit } from "@/lib/audit";
import { detectVideoEmbed } from "@/lib/video";
import {
  type PhoneLabel,
  type SocialPlatform,
  type BusinessStatus,
} from "@prisma/client";

export type ActionResult = { ok: true } | { ok: false; error: string };

const NEXT_URL_RE =
  /^\/dashboard\/listings\/[A-Za-z0-9_-]+\/edit\/(basics|category|contact|hours|photos)$/;

/**
 * Read `_next` from the form. If it points at a wizard step page, navigate
 * there. Called from the wizard step actions AFTER their try/catch so that
 * `redirect()`'s NEXT_REDIRECT exception is not swallowed by the catch.
 */
function maybeContinue(formData: FormData): void {
  const next = String(formData.get("_next") ?? "").trim();
  if (next && NEXT_URL_RE.test(next)) {
    redirect(next);
  }
}

const PHONE_LABELS: PhoneLabel[] = ["MOBILE", "LANDLINE", "WHATSAPP", "FAX"];
const SOCIAL_PLATFORMS: SocialPlatform[] = [
  "FACEBOOK",
  "INSTAGRAM",
  "TWITTER",
  "TIKTOK",
  "WHATSAPP",
  "TELEGRAM",
  "WEBSITE",
];

async function loadOwnedListing(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  const listing = await prisma.businessProfile.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, ownerId: true, status: true, slug: true, nameAr: true },
  });
  if (!listing) throw new Error("NOT_FOUND");
  const isOwner = listing.ownerId === session.user.id;
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isOwner && !isAdmin) throw new Error("FORBIDDEN");
  return { session, listing };
}

/**
 * Create a brand-new draft listing for the current user and redirect into the
 * first wizard step. Called from the dashboard "+ إضافة عمل جديد" button.
 */
export async function createDraftListingAction(): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/dashboard/listings/new");
  }

  // Pick the first city as a placeholder; the owner will refine in step 2.
  const firstCity = await prisma.city.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  const firstCategory = await prisma.category.findFirst({
    where: { isActive: true, parentId: null },
    orderBy: { displayOrder: "asc" },
  });
  if (!firstCity || !firstCategory) {
    throw new Error("Cities and categories must be seeded before creating listings");
  }

  const tempName = "عمل جديد";
  const slug = await generateUniqueListingSlug(null, tempName);

  const listing = await prisma.businessProfile.create({
    data: {
      ownerId: session.user.id,
      cityId: firstCity.id,
      categoryId: firstCategory.id,
      nameAr: tempName,
      slug,
      status: "DRAFT",
    },
  });

  await recordAudit({
    actor: {
      id: session.user.id,
      email: session.user.email ?? null,
      role: session.user.role,
    },
    action: "LISTING_CREATED",
    entityType: "BusinessProfile",
    entityId: listing.id,
    after: { slug, nameAr: tempName },
  });

  revalidatePath("/dashboard");
  redirect(`/dashboard/listings/${listing.id}/edit/basics`);
}

// ---------- Step 1: basics ----------

const basicsSchema = z.object({
  nameAr: z.string().trim().min(2, "اسم العمل قصير جداً").max(120),
  // nameEn is REQUIRED — it is the source of the public slug
  // (`/businesses/<slug>`). Latin characters only so the slug is
  // URL-safe; users get a clear error if they try Arabic here.
  nameEn: z
    .string()
    .trim()
    .min(2, "الاسم الإنكليزي مطلوب لإنشاء رابط الصفحة")
    .max(120)
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9\s.,'&\-]+$/,
      "استخدم حروفاً لاتينية وأرقاماً فقط في الاسم الإنكليزي",
    ),
  descriptionAr: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  descriptionEn: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export async function saveBasicsAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { session, listing } = await loadOwnedListing(id);
    const parsed = basicsSchema.safeParse({
      nameAr: formData.get("nameAr"),
      nameEn: formData.get("nameEn") ?? "",
      descriptionAr: formData.get("descriptionAr") ?? "",
      descriptionEn: formData.get("descriptionEn") ?? "",
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
    }
    const data = parsed.data;

    // The public slug comes from nameEn. We refresh it whenever nameEn
    // changes AND the listing is still DRAFT (so we don't break links to
    // already-published pages). Once the listing goes ACTIVE the slug is
    // frozen — admins can rename later via a dedicated tool if needed.
    const before = await prisma.businessProfile.findUnique({
      where: { id },
      select: { slug: true, nameAr: true, nameEn: true, status: true },
    });
    let slug = before!.slug;
    if (
      listing.status === "DRAFT" &&
      before!.nameEn !== data.nameEn
    ) {
      slug = await generateUniqueListingSlug(data.nameEn, data.nameAr, id);
    }

    await prisma.businessProfile.update({
      where: { id },
      data: {
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        descriptionAr: data.descriptionAr,
        descriptionEn: data.descriptionEn,
        slug,
        searchableText: [data.nameAr, data.nameEn, data.descriptionAr]
          .filter(Boolean)
          .join(" "),
      },
    });

    await recordAudit({
      actor: {
        id: session.user.id,
        email: session.user.email ?? null,
        role: session.user.role,
      },
      action: "LISTING_UPDATED",
      entityType: "BusinessProfile",
      entityId: id,
      after: { step: "basics" },
    });

    revalidatePath(`/dashboard/listings/${id}/edit/basics`);
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
  maybeContinue(formData);
  return { ok: true };
}

// ---------- Step 2: category & location ----------

const categorySchema = z.object({
  categoryId: z.string().min(1, "اختر تصنيفاً"),
  subcategoryId: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  cityId: z.string().min(1, "اختر مدينة"),
  addressAr: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  latitude: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? Number(v) : null))
    .refine((v) => v === null || (!Number.isNaN(v) && v >= -90 && v <= 90), {
      message: "خط العرض غير صحيح",
    }),
  longitude: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? Number(v) : null))
    .refine(
      (v) => v === null || (!Number.isNaN(v) && v >= -180 && v <= 180),
      { message: "خط الطول غير صحيح" },
    ),
});

export async function saveCategoryLocationAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { session } = await loadOwnedListing(id);
    const parsed = categorySchema.safeParse({
      categoryId: formData.get("categoryId"),
      subcategoryId: formData.get("subcategoryId") ?? "",
      cityId: formData.get("cityId"),
      addressAr: formData.get("addressAr") ?? "",
      latitude: formData.get("latitude") ?? "",
      longitude: formData.get("longitude") ?? "",
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
    }

    // Validate the category and (optional) subcategory belong together.
    const cat = await prisma.category.findUnique({
      where: { id: parsed.data.categoryId },
      select: { id: true, parentId: true },
    });
    if (!cat || cat.parentId !== null) {
      return { ok: false, error: "تصنيف رئيسي غير صالح" };
    }
    if (parsed.data.subcategoryId) {
      const sub = await prisma.category.findUnique({
        where: { id: parsed.data.subcategoryId },
        select: { parentId: true },
      });
      if (!sub || sub.parentId !== cat.id) {
        return { ok: false, error: "التصنيف الفرعي لا يطابق التصنيف الرئيسي" };
      }
    }

    await prisma.businessProfile.update({
      where: { id },
      data: {
        categoryId: parsed.data.categoryId,
        subcategoryId: parsed.data.subcategoryId,
        cityId: parsed.data.cityId,
        addressAr: parsed.data.addressAr,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
      },
    });

    await recordAudit({
      actor: {
        id: session.user.id,
        email: session.user.email ?? null,
        role: session.user.role,
      },
      action: "LISTING_UPDATED",
      entityType: "BusinessProfile",
      entityId: id,
      after: { step: "category" },
    });

    revalidatePath(`/dashboard/listings/${id}/edit/category`);
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
  maybeContinue(formData);
  return { ok: true };
}

// ---------- Step 3: contact (phones + social) ----------

const phoneEntrySchema = z.object({
  label: z.enum(PHONE_LABELS as [PhoneLabel, ...PhoneLabel[]]),
  number: z
    .string()
    .trim()
    .min(6, "رقم الهاتف قصير")
    .max(30, "رقم الهاتف طويل")
    .regex(/^[+\d\s\-()]+$/, "صيغة الرقم غير صحيحة"),
});

const socialEntrySchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS as [SocialPlatform, ...SocialPlatform[]]),
  url: z.string().trim().url("رابط غير صحيح").max(500),
});

export async function saveContactAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { session } = await loadOwnedListing(id);

    const phones: { label: PhoneLabel; number: string }[] = [];
    const phoneCount = Number(formData.get("phoneCount") ?? "0");
    for (let i = 0; i < phoneCount; i++) {
      const number = String(formData.get(`phone-${i}-number`) ?? "").trim();
      if (!number) continue;
      const parsed = phoneEntrySchema.safeParse({
        label: formData.get(`phone-${i}-label`),
        number,
      });
      if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? "رقم غير صحيح" };
      }
      phones.push(parsed.data);
    }

    const socials: { platform: SocialPlatform; url: string }[] = [];
    const socialCount = Number(formData.get("socialCount") ?? "0");
    for (let i = 0; i < socialCount; i++) {
      const url = String(formData.get(`social-${i}-url`) ?? "").trim();
      if (!url) continue;
      const parsed = socialEntrySchema.safeParse({
        platform: formData.get(`social-${i}-platform`),
        url,
      });
      if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? "رابط غير صحيح" };
      }
      socials.push(parsed.data);
    }

    await prisma.$transaction([
      prisma.phoneNumber.deleteMany({ where: { businessProfileId: id } }),
      prisma.socialLink.deleteMany({ where: { businessProfileId: id } }),
      prisma.phoneNumber.createMany({
        data: phones.map((p, idx) => ({
          businessProfileId: id,
          label: p.label,
          number: p.number,
          displayOrder: idx,
        })),
      }),
      prisma.socialLink.createMany({
        data: socials.map((s) => ({
          businessProfileId: id,
          platform: s.platform,
          url: s.url,
        })),
      }),
    ]);

    await recordAudit({
      actor: {
        id: session.user.id,
        email: session.user.email ?? null,
        role: session.user.role,
      },
      action: "LISTING_UPDATED",
      entityType: "BusinessProfile",
      entityId: id,
      after: { step: "contact", phones: phones.length, socials: socials.length },
    });

    revalidatePath(`/dashboard/listings/${id}/edit/contact`);
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
  maybeContinue(formData);
  return { ok: true };
}

// ---------- Step 4: working hours ----------

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function saveWorkingHoursAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { session } = await loadOwnedListing(id);

    const rows: {
      dayOfWeek: number;
      isOpen: boolean;
      is24Hours: boolean;
      openTime: string | null;
      closeTime: string | null;
    }[] = [];

    for (let day = 0; day < 7; day++) {
      const isOpen = formData.get(`day-${day}-open`) === "on";
      const is24 = formData.get(`day-${day}-24`) === "on";
      const openTime = String(formData.get(`day-${day}-openTime`) ?? "").trim();
      const closeTime = String(formData.get(`day-${day}-closeTime`) ?? "").trim();
      if (isOpen && !is24) {
        if (!timeRegex.test(openTime) || !timeRegex.test(closeTime)) {
          return {
            ok: false,
            error: "حدّد ساعات العمل بصيغة HH:MM لكل يوم مفتوح",
          };
        }
      }
      rows.push({
        dayOfWeek: day,
        isOpen,
        is24Hours: is24,
        openTime: isOpen && !is24 ? openTime : null,
        closeTime: isOpen && !is24 ? closeTime : null,
      });
    }

    await prisma.$transaction([
      prisma.workingHours.deleteMany({ where: { businessProfileId: id } }),
      prisma.workingHours.createMany({
        data: rows.map((r) => ({ ...r, businessProfileId: id })),
      }),
    ]);

    await recordAudit({
      actor: {
        id: session.user.id,
        email: session.user.email ?? null,
        role: session.user.role,
      },
      action: "LISTING_UPDATED",
      entityType: "BusinessProfile",
      entityId: id,
      after: { step: "hours" },
    });

    revalidatePath(`/dashboard/listings/${id}/edit/hours`);
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
  maybeContinue(formData);
  return { ok: true };
}

// ---------- Step 5: photos ----------

export async function uploadPhotoAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { session } = await loadOwnedListing(id);

    // Direct file uploads need cloud storage which isn't wired up yet
    // (the previous stub silently returned `/placeholder.svg`, leaving owners
    // with broken images). For now we accept only public image URLs; once
    // object storage is provisioned we'll re-enable the file branch.
    const externalUrl = String(formData.get("externalUrl") ?? "").trim();

    if (!externalUrl) {
      return { ok: false, error: "يرجى لصق رابط صورة" };
    }
    try {
      const parsedUrl = new URL(externalUrl);
      if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
        return { ok: false, error: "رابط الصورة يجب أن يبدأ بـ https" };
      }
    } catch {
      return { ok: false, error: "رابط الصورة غير صحيح" };
    }
    const storageKey = externalUrl;
    const url = externalUrl;
    const width: number | undefined = undefined;
    const height: number | undefined = undefined;
    const mimeType: string | undefined = undefined;
    const fileSize: number | undefined = undefined;

    // Enforce the per-image cap and assign the next display order in a single
    // serializable transaction. Counting + inserting in two separate calls
    // lets two concurrent uploads both pass the cap check and produce 13
    // rows; serializable isolation makes Postgres abort the loser instead.
    const created = await prisma.$transaction(
      async (tx) => {
        const count = await tx.mediaFile.count({
          where: { businessProfileId: id, type: "IMAGE" },
        });
        if (count >= 12) {
          throw new Error("MAX_IMAGES");
        }
        const row = await tx.mediaFile.create({
          data: {
            businessProfileId: id,
            uploadedById: session.user.id,
            type: "IMAGE",
            storageKey,
            url,
            width,
            height,
            mimeType,
            fileSize,
            status: "APPROVED",
            displayOrder: count,
          },
        });
        if (count === 0) {
          await tx.businessProfile.update({
            where: { id },
            data: { coverImageId: row.id },
          });
        }
        return row;
      },
      { isolationLevel: "Serializable" },
    ).catch((e: unknown) => {
      if (e instanceof Error && e.message === "MAX_IMAGES") return null;
      throw e;
    });

    if (!created) {
      return { ok: false, error: "الحد الأقصى 12 صورة لكل عمل" };
    }

    await recordAudit({
      actor: {
        id: session.user.id,
        email: session.user.email ?? null,
        role: session.user.role,
      },
      action: "MEDIA_UPLOADED",
      entityType: "MediaFile",
      entityId: created.id,
      after: { businessProfileId: id },
    });

    revalidatePath(`/dashboard/listings/${id}/edit/photos`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

/**
 * Save an external video link (YouTube, Vimeo, or a direct .mp4/.webm). We
 * only store the URL — the public profile renders an iframe / native player.
 * Capped at 6 videos per listing so a single owner can't bloat the page.
 */
export async function addVideoAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { session } = await loadOwnedListing(id);

    const externalUrl = String(formData.get("externalUrl") ?? "").trim();
    if (!externalUrl) {
      return { ok: false, error: "يرجى لصق رابط الفيديو" };
    }
    const embed = detectVideoEmbed(externalUrl);
    if (!embed) {
      return {
        ok: false,
        error:
          "الرابط غير مدعوم — استخدم رابط يوتيوب أو فيميو أو رابط ملف .mp4 / .webm مباشر",
      };
    }

    // Same serializable-cap pattern as image upload — two concurrent
    // submissions cannot both slip past the 6-video limit or collide on
    // displayOrder.
    const created = await prisma.$transaction(
      async (tx) => {
        const count = await tx.mediaFile.count({
          where: { businessProfileId: id, type: "VIDEO" },
        });
        if (count >= 6) {
          throw new Error("MAX_VIDEOS");
        }
        return tx.mediaFile.create({
          data: {
            businessProfileId: id,
            uploadedById: session.user.id,
            type: "VIDEO",
            storageKey: externalUrl,
            url: externalUrl,
            status: "APPROVED",
            displayOrder: count,
          },
        });
      },
      { isolationLevel: "Serializable" },
    ).catch((e: unknown) => {
      if (e instanceof Error && e.message === "MAX_VIDEOS") return null;
      throw e;
    });

    if (!created) {
      return { ok: false, error: "الحد الأقصى 6 فيديوهات لكل عمل" };
    }

    await recordAudit({
      actor: {
        id: session.user.id,
        email: session.user.email ?? null,
        role: session.user.role,
      },
      action: "MEDIA_UPLOADED",
      entityType: "MediaFile",
      entityId: created.id,
      after: { businessProfileId: id, kind: "VIDEO", provider: embed.provider },
    });

    revalidatePath(`/dashboard/listings/${id}/edit/photos`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function removePhotoAction(
  id: string,
  mediaId: string,
): Promise<ActionResult> {
  try {
    const { session } = await loadOwnedListing(id);
    const media = await prisma.mediaFile.findUnique({
      where: { id: mediaId },
      select: { businessProfileId: true },
    });
    if (!media || media.businessProfileId !== id) {
      return { ok: false, error: "الصورة غير موجودة" };
    }
    await prisma.mediaFile.delete({ where: { id: mediaId } });

    // If cover was removed, pick the next image as cover (or null it).
    const profile = await prisma.businessProfile.findUnique({
      where: { id },
      select: { coverImageId: true },
    });
    if (profile?.coverImageId === mediaId) {
      const next = await prisma.mediaFile.findFirst({
        where: { businessProfileId: id, type: "IMAGE" },
        orderBy: { displayOrder: "asc" },
      });
      await prisma.businessProfile.update({
        where: { id },
        data: { coverImageId: next?.id ?? null },
      });
    }

    await recordAudit({
      actor: {
        id: session.user.id,
        email: session.user.email ?? null,
        role: session.user.role,
      },
      action: "LISTING_UPDATED",
      entityType: "BusinessProfile",
      entityId: id,
      after: { step: "photos", removed: mediaId },
    });

    revalidatePath(`/dashboard/listings/${id}/edit/photos`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

// ---------- Owner: soft-delete listing ----------

export async function softDeleteListingAction(
  id: string,
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "يجب تسجيل الدخول" };

    const existing = await prisma.businessProfile.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        slug: true,
        nameAr: true,
        status: true,
        deletedAt: true,
        category: { select: { slug: true } },
      },
    });
    const isSuperAdmin = session.user.role === "SUPER_ADMIN";
    const isOwner = existing?.ownerId === session.user.id;
    if (!existing || (!isOwner && !isSuperAdmin)) {
      return { ok: false, error: "ليس لديك صلاحية حذف هذا العمل" };
    }
    if (existing.deletedAt !== null) {
      return { ok: true };
    }

    const updated = await prisma.businessProfile.updateMany({
      where: isSuperAdmin
        ? { id, deletedAt: null }
        : { id, ownerId: session.user.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (updated.count === 0) {
      const recheck = await prisma.businessProfile.findUnique({
        where: { id },
        select: { ownerId: true, deletedAt: true },
      });
      if (recheck?.deletedAt) return { ok: true };
      if (!isSuperAdmin && recheck?.ownerId !== session.user.id) {
        return { ok: false, error: "ليس لديك صلاحية حذف هذا العمل" };
      }
      return { ok: false, error: "تعذّر حذف العمل" };
    }

    await recordAudit({
      actor: {
        id: session.user.id,
        email: session.user.email ?? null,
        role: session.user.role,
      },
      action: "LISTING_DELETED",
      entityType: "BusinessProfile",
      entityId: id,
      before: { status: existing.status, slug: existing.slug },
      after: { deletedAt: new Date().toISOString() },
    });

    revalidatePath("/dashboard");
    revalidatePath("/businesses");
    revalidatePath("/businesses/[slug]", "page");
    revalidatePath("/categories");
    revalidatePath("/admin/moderation");
    revalidatePath("/admin/businesses");
    revalidatePath("/admin");
    revalidatePath("/");
    if (existing.category?.slug) {
      revalidatePath(`/category/${existing.category.slug}`);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

// ---------- Submit for review ----------

export async function submitForReviewAction(id: string): Promise<ActionResult> {
  try {
    const { session, listing } = await loadOwnedListing(id);

    // Server-side completeness check.
    const full = await prisma.businessProfile.findUnique({
      where: { id },
      include: {
        phoneNumbers: { take: 1 },
        workingHours: { take: 1 },
        category: true,
        city: true,
      },
    });
    if (!full) return { ok: false, error: "العمل غير موجود" };
    if (!full.nameAr || full.nameAr === "عمل جديد") {
      return { ok: false, error: "يرجى تحديد اسم العمل (الخطوة 1)" };
    }
    if (!full.nameEn || !full.nameEn.trim()) {
      return {
        ok: false,
        error: "يرجى إضافة الاسم بالإنجليزية لإنشاء رابط مناسب (الخطوة 1)",
      };
    }
    if (!full.categoryId || !full.cityId) {
      return { ok: false, error: "يرجى تحديد التصنيف والمدينة (الخطوة 2)" };
    }
    if (full.phoneNumbers.length === 0) {
      return { ok: false, error: "يرجى إضافة وسيلة تواصل واحدة على الأقل (الخطوة 3)" };
    }
    if (full.workingHours.length === 0) {
      return { ok: false, error: "يرجى تحديد ساعات العمل (الخطوة 4)" };
    }

    // Drafts go to PENDING. Edits to ACTIVE listings stay ACTIVE (the edit
    // becomes immediately visible to the public — only first publication
    // requires moderation).
    const nextStatus: BusinessStatus =
      listing.status === "DRAFT" || listing.status === "REJECTED"
        ? "PENDING"
        : listing.status;

    await prisma.businessProfile.update({
      where: { id },
      data: { status: nextStatus },
    });

    await recordAudit({
      actor: {
        id: session.user.id,
        email: session.user.email ?? null,
        role: session.user.role,
      },
      action: "LISTING_SUBMITTED",
      entityType: "BusinessProfile",
      entityId: id,
      before: { status: listing.status },
      after: { status: nextStatus },
    });

    revalidatePath("/dashboard");
    revalidatePath("/admin/moderation");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

// ---------- Admin moderation actions ----------

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function approveListingAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    const before = await prisma.businessProfile.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!before) return { ok: false, error: "العمل غير موجود" };

    await prisma.businessProfile.update({
      where: { id },
      data: { status: "ACTIVE", publishedAt: new Date() },
    });
    await recordAudit({
      actor: {
        id: session.user.id,
        email: session.user.email ?? null,
        role: session.user.role,
      },
      action: "LISTING_APPROVED",
      entityType: "BusinessProfile",
      entityId: id,
      before,
      after: { status: "ACTIVE" },
    });
    revalidatePath("/admin/moderation");
    revalidatePath("/businesses");
    revalidatePath("/businesses/[slug]", "page");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function rejectListingAction(
  id: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    const cleanReason = reason.trim().slice(0, 500);
    const before = await prisma.businessProfile.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!before) return { ok: false, error: "العمل غير موجود" };

    await prisma.businessProfile.update({
      where: { id },
      data: {
        status: "REJECTED",
        suspensionReason: cleanReason || null,
      },
    });
    await recordAudit({
      actor: {
        id: session.user.id,
        email: session.user.email ?? null,
        role: session.user.role,
      },
      action: "LISTING_REJECTED",
      entityType: "BusinessProfile",
      entityId: id,
      before,
      after: { status: "REJECTED", reason: cleanReason || null },
    });
    revalidatePath("/admin/moderation");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) {
    if (e.message === "UNAUTHENTICATED") return "يجب تسجيل الدخول";
    if (e.message === "FORBIDDEN") return "ليس لديك صلاحية تعديل هذا العمل";
    if (e.message === "NOT_FOUND") return "العمل غير موجود";
    return e.message;
  }
  return "حدث خطأ غير متوقع";
}
