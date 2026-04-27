import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { loadState, signIn } from "./helpers";

const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
});

async function seedOwnedListing(opts: { ownerId: string; nameAr: string }) {
  const slug = "e2e-owner-delete-target";
  const city = await prisma.city.findFirst({ where: { isActive: true } });
  const category = await prisma.category.findFirst({
    where: { isActive: true, parentId: null },
  });
  if (!city || !category) {
    throw new Error(
      "[e2e] cities/categories must be seeded before running the delete spec",
    );
  }
  return prisma.businessProfile.upsert({
    where: { slug },
    update: {
      ownerId: opts.ownerId,
      nameAr: opts.nameAr,
      status: "ACTIVE",
      deletedAt: null,
      cityId: city.id,
      categoryId: category.id,
      publishedAt: new Date(),
    },
    create: {
      ownerId: opts.ownerId,
      cityId: city.id,
      categoryId: category.id,
      nameAr: opts.nameAr,
      slug,
      status: "ACTIVE",
      publishedAt: new Date(),
    },
    select: { id: true, nameAr: true, slug: true },
  });
}

test.describe("Owner deletes their own listing", () => {
  test("delete removes the listing from the dashboard, 404s the public URL, and is idempotent", async ({
    page,
  }) => {
    const state = loadState();

    const unique = Math.random().toString(36).slice(2, 6);
    const nameAr = `عمل اختبار حذف ${unique}`;
    const seeded = await seedOwnedListing({
      ownerId: state.user.id,
      nameAr,
    });

    await prisma.auditLog.deleteMany({
      where: {
        action: "LISTING_DELETED",
        entityType: "BusinessProfile",
        entityId: seeded.id,
      },
    });

    await signIn(page, state.user);

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const card = page
      .locator(`a[href="/businesses/${seeded.slug}"]`)
      .first()
      .locator("xpath=ancestor::*[contains(@class,'space-y-3')][1]");
    await expect(card.getByText(nameAr).first()).toBeVisible();

    await card.getByRole("button", { name: `حذف ${nameAr}` }).click();

    const confirmButton = card.getByRole("button", { name: "تأكيد الحذف" });
    await expect(confirmButton).toBeDisabled();

    const confirmInput = card.locator(`input#delete-confirm-${seeded.id}`);
    await confirmInput.fill(nameAr);
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();

    // (a) The listing disappears from the dashboard.
    await expect(card).toBeHidden({ timeout: 20_000 });
    await expect(page.locator(`a[href="/businesses/${seeded.slug}"]`)).toHaveCount(
      0,
    );

    // (b) The public detail URL now 404s.
    const detailResponse = await page.goto(`/businesses/${seeded.slug}`, {
      waitUntil: "domcontentloaded",
    });
    expect(detailResponse?.status()).toBe(404);

    // The owner edit URL is also locked.
    const editResponse = await page.goto(
      `/dashboard/listings/${seeded.id}/edit/basics`,
      { waitUntil: "domcontentloaded" },
    );
    expect(editResponse?.status()).toBe(404);

    const rowAfterFirst = await prisma.businessProfile.findUnique({
      where: { id: seeded.id },
      select: { deletedAt: true, nameAr: true },
    });
    expect(rowAfterFirst?.deletedAt).not.toBeNull();
    expect(rowAfterFirst?.nameAr).toBe(nameAr);

    const auditAfterFirst = await prisma.auditLog.count({
      where: {
        action: "LISTING_DELETED",
        entityType: "BusinessProfile",
        entityId: seeded.id,
        actorId: state.user.id,
      },
    });
    expect(auditAfterFirst).toBe(1);

    // (c) Idempotent: revive the row, open the confirm panel, then
    // out-of-band re-delete before the user clicks confirm. The action
    // must hit its no-op branch and return ok with no duplicate audit.
    await prisma.businessProfile.update({
      where: { id: seeded.id },
      data: { deletedAt: null },
    });
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const revivedCard = page
      .locator(`a[href="/businesses/${seeded.slug}"]`)
      .first()
      .locator("xpath=ancestor::*[contains(@class,'space-y-3')][1]");
    await expect(revivedCard.getByText(nameAr).first()).toBeVisible();
    await revivedCard
      .getByRole("button", { name: `حذف ${nameAr}` })
      .click();
    await revivedCard
      .locator(`input#delete-confirm-${seeded.id}`)
      .fill(nameAr);

    await prisma.businessProfile.update({
      where: { id: seeded.id },
      data: { deletedAt: new Date() },
    });

    await revivedCard
      .getByRole("button", { name: "تأكيد الحذف" })
      .click();

    await expect(revivedCard).toBeHidden({ timeout: 20_000 });
    await expect(
      page.getByText("ليس لديك صلاحية حذف هذا العمل"),
    ).toHaveCount(0);
    await expect(page.getByText("تعذّر حذف العمل")).toHaveCount(0);

    const auditAfterSecond = await prisma.auditLog.count({
      where: {
        action: "LISTING_DELETED",
        entityType: "BusinessProfile",
        entityId: seeded.id,
        actorId: state.user.id,
      },
    });
    expect(auditAfterSecond).toBe(1);
  });

  test("a different owner cannot delete someone else's listing via crafted form input", async ({
    page,
  }) => {
    const state = loadState();

    const targetBefore = await prisma.businessProfile.findUnique({
      where: { id: state.business.id },
      select: { ownerId: true, deletedAt: true, status: true },
    });
    expect(targetBefore).not.toBeNull();
    expect(targetBefore?.ownerId).not.toBe(state.user.id);
    expect(targetBefore?.deletedAt).toBeNull();

    // Seed a decoy the e2e user owns so the legit delete UI is reachable.
    // The route handler below swaps the decoy id for the foreign business
    // id in the outgoing server-action POST body, exercising the real
    // Next-Action boundary with a forged payload.
    const decoyName = `طعم اختبار حذف ${Math.random().toString(36).slice(2, 6)}`;
    const decoy = await seedOwnedListing({
      ownerId: state.user.id,
      nameAr: decoyName,
    });
    await prisma.auditLog.deleteMany({
      where: {
        action: "LISTING_DELETED",
        entityType: "BusinessProfile",
        entityId: { in: [decoy.id, state.business.id] },
      },
    });

    await signIn(page, state.user);

    const auditBefore = await prisma.auditLog.count({
      where: {
        action: "LISTING_DELETED",
        entityType: "BusinessProfile",
        entityId: state.business.id,
      },
    });

    // The dashboard never renders the foreign listing for the wrong owner.
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(
      page.locator(`a[href="/businesses/${state.business.slug}"]`),
    ).toHaveCount(0);

    const decoyCard = page
      .locator(`a[href="/businesses/${decoy.slug}"]`)
      .first()
      .locator("xpath=ancestor::*[contains(@class,'space-y-3')][1]");
    await decoyCard.getByText(decoyName).first().waitFor();
    await decoyCard
      .getByRole("button", { name: `حذف ${decoyName}` })
      .click();
    await decoyCard
      .locator(`input#delete-confirm-${decoy.id}`)
      .fill(decoyName);

    await page.route("**/dashboard*", async (route) => {
      const req = route.request();
      if (req.method() !== "POST") {
        await route.continue();
        return;
      }
      const body = req.postData();
      if (!body || !body.includes(decoy.id)) {
        await route.continue();
        return;
      }
      const forged = body.split(decoy.id).join(state.business.id);
      const headers = await req.allHeaders();
      await route.continue({ postData: forged, headers });
    });

    await decoyCard
      .getByRole("button", { name: "تأكيد الحذف" })
      .click();

    // The action returns ok:false → the toast surfaces the forbidden message.
    await expect(
      page.getByText("ليس لديك صلاحية حذف هذا العمل"),
    ).toBeVisible({ timeout: 20_000 });

    const targetAfter = await prisma.businessProfile.findUnique({
      where: { id: state.business.id },
      select: { ownerId: true, deletedAt: true, status: true },
    });
    expect(targetAfter?.deletedAt).toBeNull();
    expect(targetAfter?.status).toBe(targetBefore?.status);
    expect(targetAfter?.ownerId).toBe(targetBefore?.ownerId);

    const auditAfter = await prisma.auditLog.count({
      where: {
        action: "LISTING_DELETED",
        entityType: "BusinessProfile",
        entityId: state.business.id,
      },
    });
    expect(auditAfter).toBe(auditBefore);

    const decoyAfter = await prisma.businessProfile.findUnique({
      where: { id: decoy.id },
      select: { deletedAt: true },
    });
    expect(decoyAfter?.deletedAt).toBeNull();
  });
});
