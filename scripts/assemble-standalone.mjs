#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const artifactRoot = resolve(here, "..");

const standaloneDir = resolve(
  artifactRoot,
  ".next/standalone/artifacts/nabk-directory",
);

if (!existsSync(standaloneDir)) {
  console.error(
    "[assemble-standalone] Expected standalone output at " +
      standaloneDir +
      " — did `next build` run with `output: \"standalone\"` in next.config.ts?",
  );
  process.exit(1);
}

const copies = [
  {
    label: "static",
    from: resolve(artifactRoot, ".next/static"),
    to: resolve(standaloneDir, ".next/static"),
    required: true,
  },
  {
    label: "public",
    from: resolve(artifactRoot, "public"),
    to: resolve(standaloneDir, "public"),
    required: false,
  },
];

for (const { label, from, to, required } of copies) {
  if (!existsSync(from)) {
    if (required) {
      console.error(
        `[assemble-standalone] Required directory missing: ${from}`,
      );
      process.exit(1);
    }
    console.log(`[assemble-standalone] Skipping ${label}: ${from} not found`);
    continue;
  }
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
  console.log(`[assemble-standalone] Copied ${label}: ${from} -> ${to}`);
}

console.log("[assemble-standalone] Standalone bundle ready at " + standaloneDir);
