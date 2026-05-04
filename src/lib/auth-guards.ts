/**
 * Auth guard helpers for Server Actions and Route Handlers.
 *
 * Usage (Server Components / Server Actions):
 *   const session = await requireAdmin();
 *   const session = await requireAdmin("/admin/pdf/legacy"); // custom callbackUrl
 *   const session = await requireSuperAdmin();
 *   const session = await requireAuth();
 *
 * The callbackUrl param is optional — defaults to "/admin".
 * It is appended to /sign-in so NextAuth redirects back after login.
 */

import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";

const ADMIN_ROLES: Role[] = ["ADMIN", "SUPER_ADMIN"];

/** Redirects to sign-in with callbackUrl. Never returns. */
function goToSignIn(callbackUrl = "/admin"): never {
  redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
}

/**
 * Requires the user to be ADMIN or SUPER_ADMIN.
 * Redirects to sign-in if not authenticated or not privileged.
 */
export async function requireAdmin(callbackUrl?: string) {
  const session = await auth();
  if (!session?.user?.id) goToSignIn(callbackUrl);
  if (!ADMIN_ROLES.includes(session.user.role)) goToSignIn(callbackUrl);
  return session;
}

/**
 * Requires the user to be SUPER_ADMIN only.
 * Redirects to sign-in if not authenticated or not SUPER_ADMIN.
 */
export async function requireSuperAdmin(callbackUrl?: string) {
  const session = await auth();
  if (!session?.user?.id) goToSignIn(callbackUrl);
  if (session.user.role !== "SUPER_ADMIN") goToSignIn(callbackUrl);
  return session;
}

/**
 * Requires any authenticated user (any role).
 * Redirects to sign-in if not logged in.
 */
export async function requireAuth(callbackUrl?: string) {
  const session = await auth();
  if (!session?.user?.id) goToSignIn(callbackUrl);
  return session;
}
