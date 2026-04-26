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

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;

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
      }
      const userId = (token.id as string | undefined) ?? token.sub;
      if (!userId) return token;
      const refreshedAt = (token.refreshedAt as number | undefined) ?? 0;
      const stale = Date.now() - refreshedAt > 60_000;
      if (trigger === "update" || !token.role || stale) {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true, emailVerified: true, deletedAt: true },
        });
        if (!dbUser || dbUser.deletedAt) return null;
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
