import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

export const TEST_USER = {
  email: "e2e-tester@nabk.local",
  password: "E2eTester123!",
  name: "مختبر E2E",
};

export type E2EState = {
  baseURL: string;
  user: { id: string; email: string; password: string; name: string };
  business: { id: string; nameAr: string; slug: string };
};

const STATE_DIR = path.join(__dirname, ".state");
export const STATE_PATH = path.join(STATE_DIR, "e2e-state.json");

export default async function globalSetup() {
  const replitDomain = process.env.REPLIT_DEV_DOMAIN;
  const baseURL =
    process.env.E2E_BASE_URL ??
    (replitDomain ? `https://${replitDomain}` : "http://localhost:3000");

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set for the E2E setup to seed a test user.",
    );
  }

  const prisma = new PrismaClient();
  try {
    // Create / reset a deterministic test user. We back-date `createdAt` past
    // the 7-day "new account" comment-moderation window so posted comments are
    // VISIBLE immediately (otherwise they would be PENDING_REVIEW and the
    // comment assertion would fail). emailVerified is set to mirror a normal
    // signed-in user.
    const passwordHash = await bcrypt.hash(TEST_USER.password, 10);
    const aMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const user = await prisma.user.upsert({
      where: { email: TEST_USER.email },
      update: {
        name: TEST_USER.name,
        passwordHash,
        role: "BUSINESS_OWNER",
        emailVerified: new Date(),
        deletedAt: null,
      },
      create: {
        name: TEST_USER.name,
        email: TEST_USER.email,
        passwordHash,
        role: "BUSINESS_OWNER",
        emailVerified: new Date(),
        createdAt: aMonthAgo,
      },
      select: { id: true, email: true, name: true },
    });

    // Force createdAt back even on update path (upsert doesn't touch it on
    // update). Without this, repeated runs against a freshly-created user
    // would leave it inside the new-account window.
    await prisma.user.update({
      where: { id: user.id },
      data: { createdAt: aMonthAgo },
    });

    // Pick any active business that the test user does NOT own. The seed
    // creates several owned by `owner@nabk.local`, so the test user (a
    // distinct account) is always eligible.
    const business = await prisma.businessProfile.findFirst({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        ownerId: { not: user.id },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, nameAr: true, slug: true },
    });
    if (!business) {
      throw new Error(
        "E2E setup could not find an ACTIVE business not owned by the test user. Run `pnpm --filter @workspace/nabk-directory db:seed` first.",
      );
    }

    // Reset prior test data on this user/business so every run starts clean
    // and assertions like "تقييمك: 5" reflect the action taken in the test.
    await prisma.$transaction([
      prisma.rating.deleteMany({
        where: { userId: user.id, businessProfileId: business.id },
      }),
      prisma.comment.deleteMany({
        where: { userId: user.id, businessProfileId: business.id },
      }),
    ]);

    // Recompute aggregates for the chosen business after pruning.
    const agg = await prisma.rating.aggregate({
      where: { businessProfileId: business.id },
      _avg: { score: true },
      _count: { score: true },
    });
    await prisma.businessProfile.update({
      where: { id: business.id },
      data: {
        ratingAverage: agg._avg.score ?? 0,
        ratingCount: agg._count.score ?? 0,
      },
    });

    mkdirSync(STATE_DIR, { recursive: true });
    const state: E2EState = {
      baseURL,
      user: { ...user, password: TEST_USER.password },
      business,
    };
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
    console.log(
      `[e2e] setup ready — user=${user.email} business=${business.slug} (${business.id}) baseURL=${baseURL}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
