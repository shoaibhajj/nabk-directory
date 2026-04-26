"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { sendEmail, verifyEmailHtml, passwordResetHtml } from "@/lib/email";
import { getAppUrl } from "@/lib/utils";
import { withRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
}

const signUpSchema = z.object({
  name: z.string().min(2, "الاسم قصير جداً"),
  email: z.string().email("بريد إلكتروني غير صحيح"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
});

export async function signUpAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const ip = await clientIp();
  const limited = await withRateLimit(`signup:${ip}`, 5, 60 * 60 * 1000);
  if (!limited.ok) {
    return { error: "محاولات كثيرة، حاول لاحقاً" };
  }

  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }
  const { name, email, password } = parsed.data;
  const normalized = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) {
    return { error: "هذا البريد مسجّل مسبقاً" };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email: normalized, passwordHash, role: "BUSINESS_OWNER" },
  });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  const link = `${getAppUrl()}/verify-email?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "تأكيد البريد الإلكتروني — دليل النبك",
    html: verifyEmailHtml(user.name, link),
  });
  await recordAudit({
    actor: { id: user.id, email: user.email, role: user.role },
    action: "USER_CREATED",
    entityType: "User",
    entityId: user.id,
    ipAddress: ip,
  });

  redirect("/verify-email?sent=1");
}

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function signInAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const ip = await clientIp();
  const limited = await withRateLimit(`signin:${ip}`, 10, 15 * 60 * 1000);
  if (!limited.ok) {
    return { error: "محاولات كثيرة، حاول لاحقاً" };
  }

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "بيانات غير صحيحة" };

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
    return { error: undefined };
  } catch (e) {
    if ((e as Error)?.message?.includes("NEXT_REDIRECT")) throw e;
    return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" };
  }
}

export async function signOutAndRedirect() {
  redirect("/api/auth/signout");
}

const verifyEmailSchema = z.object({ token: z.string().min(10) });

/**
 * Verifies the email-verification token and, on success, mints a single-use
 * `LoginToken` so the caller can auto-sign-the-user-in without re-entering
 * a password. The caller (a server action invoked from /verify-email) is
 * responsible for handing the `loginToken` to `signIn("credentials", { ... })`.
 */
export async function verifyEmailAction(
  token: string,
): Promise<{ ok?: boolean; error?: string; loginToken?: string }> {
  const parsed = verifyEmailSchema.safeParse({ token });
  if (!parsed.success) return { error: "رابط غير صالح" };

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "الرابط منتهي أو مستخدم سابقاً" };
  }

  const loginToken = crypto.randomBytes(32).toString("hex");
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.loginToken.create({
      data: {
        userId: record.userId,
        tokenHash: hashToken(loginToken),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    }),
  ]);
  return { ok: true, loginToken };
}

export async function autoSignInAfterVerify(loginToken: string) {
  await signIn("credentials", { oneTimeToken: loginToken, redirectTo: "/dashboard" });
}

const forgotSchema = z.object({ email: z.string().email() });

export async function forgotPasswordAction(
  _prev: { sent?: boolean; error?: string } | undefined,
  formData: FormData,
): Promise<{ sent?: boolean; error?: string }> {
  const ip = await clientIp();
  const limited = await withRateLimit(`forgot:${ip}`, 5, 60 * 60 * 1000);
  if (!limited.ok) {
    return { error: "محاولات كثيرة، حاول لاحقاً" };
  }
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "بريد إلكتروني غير صحيح" };

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  // Always pretend success to avoid user enumeration
  if (user && !user.deletedAt) {
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const link = `${getAppUrl()}/reset-password?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: "إعادة تعيين كلمة المرور — دليل النبك",
      html: passwordResetHtml(user.name, link),
    });
  }
  return { sent: true };
}

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "8 أحرف على الأقل"),
});

export async function resetPasswordAction(
  _prev: { ok?: boolean; error?: string } | undefined,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "الرابط منتهي أو مستخدم سابقاً" };
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  // Bumping `passwordChangedAt` invalidates all existing JWT sessions
  // for this user (see auth.ts JWT callback).
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, passwordChangedAt: new Date() },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);
  return { ok: true };
}
