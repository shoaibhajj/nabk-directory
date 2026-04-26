import NextAuth, { type DefaultSession, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      emailVerified: Date | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    emailVerified?: Date | null;
  }
}

import crypto from "node:crypto";

const credentialsSchema = z
  .object({
    email: z.string().email().optional(),
    password: z.string().min(1).optional(),
    oneTimeToken: z.string().min(10).optional(),
  })
  .refine((c) => (c.email && c.password) || c.oneTimeToken, {
    message: "missing credentials",
  });

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      oneTimeToken: { label: "OneTimeToken", type: "text" },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;

      // 1) one-time login token (used after email verification).
      // Consumption MUST be atomic so two concurrent requests cannot both
      // succeed with the same token. We use `updateMany` with a conditional
      // WHERE clause and require exactly one row to be updated; only then
      // do we look up the user.
      if (parsed.data.oneTimeToken) {
        const tokenHashValue = hashToken(parsed.data.oneTimeToken);
        const existing = await prisma.loginToken.findUnique({
          where: { tokenHash: tokenHashValue },
          select: { userId: true },
        });
        if (!existing) return null;
        const claimed = await prisma.loginToken.updateMany({
          where: {
            tokenHash: tokenHashValue,
            usedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { usedAt: new Date() },
        });
        if (claimed.count !== 1) return null;
        const u = await prisma.user.findUnique({
          where: { id: existing.userId },
        });
        if (!u || u.deletedAt) return null;
        return {
          id: u.id,
          email: u.email,
          name: u.name,
          image: u.image,
          role: u.role,
          emailVerified: u.emailVerified,
        };
      }

      // 2) email + password
      if (!parsed.data.email || !parsed.data.password) return null;
      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
      });
      if (!user || !user.passwordHash) return null;
      if (user.deletedAt) return null;

      const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!valid) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        emailVerified: user.emailVerified,
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers,
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.emailVerified = user.emailVerified ?? null;
        token.refreshedAt = Date.now();
        token.issuedAt = Math.floor(Date.now() / 1000);
      }
      const userId = (token.id as string | undefined) ?? token.sub;
      if (!userId) return token;
      const refreshedAt = (token.refreshedAt as number | undefined) ?? 0;
      const stale = Date.now() - refreshedAt > 60_000;
      if (trigger === "update" || !token.role || stale) {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            role: true,
            emailVerified: true,
            deletedAt: true,
            passwordChangedAt: true,
          },
        });
        if (!dbUser || dbUser.deletedAt) return null;
        // Invalidate sessions issued at or before the latest password
        // change. Use `>=` so same-second resets revoke the prior token.
        const issuedAt = (token.issuedAt as number | undefined) ?? 0;
        if (
          dbUser.passwordChangedAt &&
          Math.floor(dbUser.passwordChangedAt.getTime() / 1000) >= issuedAt
        ) {
          return null;
        }
        token.id = userId;
        token.role = dbUser.role;
        token.emailVerified = dbUser.emailVerified;
        token.refreshedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = (token.id as string) ?? (token.sub as string);
        session.user.role = (token.role as Role) ?? "BUSINESS_OWNER";
        session.user.emailVerified = (token.emailVerified as Date | null) ?? null;
      }
      return session;
    },
  },
  trustHost: true,
});

export const isGoogleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);
