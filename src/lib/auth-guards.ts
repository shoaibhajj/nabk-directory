/**
 * Auth guard helpers for Server Actions and Route Handlers.
 *
 * Usage:
 *   const session = await requireAdmin();   // throws for GUEST / BUSINESS_OWNER
 *   const session = await requireSuperAdmin(); // throws for anyone below SUPER_ADMIN
 *   const session = await requireAuth();    // throws only if not logged in
 */

import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";

const ADMIN_ROLES: Role[] = ["ADMIN", "SUPER_ADMIN"];

/**
 * Returns the current session if the user is ADMIN or SUPER_ADMIN.
 * Throws a plain Error (which Next.js Server Actions surface as 500)
 * if the user is not authenticated or not privileged enough.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
  redirect("/sign-in?callbackUrl=/admin/pdf/legacy");
  }
  if (!ADMIN_ROLES.includes(session.user.role)) {
      redirect("/sign-in?callbackUrl=/admin/pdf/legacy");
  }
  return session;
}

/**
 * Returns the current session if the user is SUPER_ADMIN only.
 */
export async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
     redirect("/sign-in?callbackUrl=/admin/pdf/legacy");
  }
  if (session.user.role !== "SUPER_ADMIN") {
    throw new Error("هذا الإجراء متاح للمسؤول الأعلى فقط");
  }
  return session;
}

/**
 * Returns the current session for any authenticated user.
 * Throws if the user is not logged in.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
     redirect("/sign-in?callbackUrl=/admin/pdf/legacy");
  }
  return session;
}
