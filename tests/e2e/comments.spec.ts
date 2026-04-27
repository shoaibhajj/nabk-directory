import { test, expect } from "@playwright/test";
import { loadState, signIn } from "./helpers";

test.describe("Comment form on the public dev domain", () => {
  test("a signed-in user can post a comment and see it on the page", async ({
    page,
  }) => {
    const state = loadState();
    await signIn(page, state.user);

    await page.goto(`/businesses/${state.business.slug}#comments`, {
      waitUntil: "domcontentloaded",
    });

    // Use a unique body so we can assert against this exact comment
    // independent of any pre-existing data on the business.
    const unique = Math.random().toString(36).slice(2, 8);
    const body = `تعليق آلي للاختبار رقم ${unique}`;

    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();
    await textarea.fill(body);

    // The publish button label is "نشر التعليق" for top-level comments.
    await page.getByRole("button", { name: "نشر التعليق" }).click();

    // The new comment is server-rendered after `router.refresh()`. The
    // global setup back-dates the test user so comments are VISIBLE on
    // first post (not held in PENDING_REVIEW).
    await expect(page.getByText(body)).toBeVisible({ timeout: 20_000 });

    // Reload to verify it is actually persisted, not just optimistically
    // rendered.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText(body)).toBeVisible();
  });
});
