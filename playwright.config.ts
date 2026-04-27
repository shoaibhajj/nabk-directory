import { defineConfig, devices } from "@playwright/test";
import { readdirSync, existsSync } from "node:fs";
import path from "node:path";

const replitDomain = process.env.REPLIT_DEV_DOMAIN;
const explicitBaseURL = process.env.E2E_BASE_URL;
const baseURL = explicitBaseURL ?? (replitDomain ? `https://${replitDomain}` : null);

if (!baseURL) {
  // The whole point of these tests is to exercise the proxied public dev
  // domain (the original bug only reproduced on multi-segment hostnames).
  // Refuse to fall back to localhost so a misconfigured run can't pass
  // silently against a host that bypasses the regression path.
  throw new Error(
    "[e2e] Neither E2E_BASE_URL nor REPLIT_DEV_DOMAIN is set. Refusing to " +
      "run against localhost — these tests must hit the public Replit dev " +
      "domain (or an equivalent proxied URL) to guard the next.config.ts " +
      "allowedOrigins regression. Re-run inside the workspace, or pass " +
      "E2E_BASE_URL=https://your-host.",
  );
}

/**
 * Playwright's bundled chromium-headless-shell links against `libgbm.so.1`
 * (mesa) and `libudev.so.1` (systemd) which are not on the default loader
 * path inside the NixOS dev container. We discover the newest versions in
 * `/nix/store` at config-load time and prepend their `lib/` directories to
 * `LD_LIBRARY_PATH` so the shell can launch.
 */
function discoverNixLibDirs(): string[] {
  const root = "/nix/store";
  if (!existsSync(root)) return [];
  let entries: string[] = [];
  try {
    entries = readdirSync(root);
  } catch {
    return [];
  }
  function pickLatest(prefix: string): string | null {
    const matches = entries
      .filter((name) => name.includes(prefix))
      .sort()
      .reverse();
    for (const name of matches) {
      const lib = path.join(root, name, "lib");
      if (existsSync(lib)) return lib;
    }
    return null;
  }
  const libs = [pickLatest("-mesa-libgbm-"), pickLatest("-systemd-")].filter(
    (v): v is string => v !== null,
  );
  return libs;
}

const extraLibDirs = discoverNixLibDirs();
if (extraLibDirs.length > 0) {
  const existing = process.env.LD_LIBRARY_PATH ?? "";
  process.env.LD_LIBRARY_PATH = [...extraLibDirs, existing]
    .filter(Boolean)
    .join(":");
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  globalSetup: require.resolve("./tests/e2e/global-setup.ts"),
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: {
      "Accept-Language": "ar",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
