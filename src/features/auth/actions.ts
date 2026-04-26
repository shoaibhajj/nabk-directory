"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { sendEmail, verifyEmailHtml } from "@/lib/email";
import { getAppUrl } from "@/lib/utils";

const signUpSchema = z.object({
  name: z.string().min(2, "الاسم قصير جداً"),
  email: z.string().email("بريد إلكتروني غير صحيح"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
});

export async function signUpAction(_prev: { error?: string } | undefined, formData: FormData) {
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

  // Email verification token
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  const link = `${getAppUrl()}/verify-email?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "تأكيد البريد الإلكتروني — دليل النبك",
    html: verifyEmailHtml(user.name, link),
  });

  await signIn("credentials", {
    email: normalized,
    password,
    redirectTo: "/dashboard",
  });
  return { error: undefined };
}

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function signInAction(_prev: { error?: string } | undefined, formData: FormData) {
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
