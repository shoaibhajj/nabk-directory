import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { STATE_PATH, type E2EState } from "./global-setup";

export function loadState(): E2EState {
  return JSON.parse(readFileSync(STATE_PATH, "utf8")) as E2EState;
}

/**
 * Sign in via the visible /sign-in form. We intentionally drive the same
 * server action a normal user would so this test covers the next.config.ts
 * `allowedOrigins` / `allowedDevOrigins` configuration that previously
 * blocked star clicks on the public Replit dev domain.
 */
export async function signIn(
  page: Page,
  creds: { email: string; password: string },
) {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(creds.email);
  await page.locator('input[name="password"]').fill(creds.password);
  await Promise.all([
    page.waitForURL(/\/dashboard(?:\?|$|\/)/, { timeout: 30_000 }),
    page.locator('button[type="submit"]').click(),
  ]);
  await expect(page).toHaveURL(/\/dashboard/);
}
