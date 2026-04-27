import { test, expect } from "@playwright/test";
import { loadState, signIn } from "./helpers";

test.describe("Rating widget on the public dev domain", () => {
  test("a signed-in user can submit a 5-star rating that survives a reload", async ({
    page,
  }) => {
    const state = loadState();
    await signIn(page, state.user);

    await page.goto(`/businesses/${state.business.id}#ratings`, {
      waitUntil: "domcontentloaded",
    });

    // The rating widget renders five interactive star buttons labelled
    // "<n> نجوم". Clicking the 5th one fires the `submitRatingAction`
    // server action — exactly the path that was failing on the public
    // dev domain because of the single-segment-subdomain origin glob.
    const fifthStar = page.getByRole("button", { name: "5 نجوم" });
    await expect(fifthStar).toBeVisible();
    await fifthStar.click();

    // The "شكراً لك" thank-you text only appears after the server action
    // has resolved successfully, so waiting on it guarantees the rating
    // was actually persisted (and we are not reloading mid-flight).
    await expect(page.getByText(/شكراً لك/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("تقييمك: 5 من 5", { exact: false })).toBeVisible();

    // Reload to ensure the rating was actually persisted server-side and
    // is read back correctly on the next render.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText("تقييمك: 5 من 5", { exact: false })).toBeVisible();
  });
});
