"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/rate-limit";

export type ActionResult = { ok: true } | { ok: false; error: string };

const idSchema = z.object({ id: z.string().min(1) });

/**
 * Marks one notification as read for the current user. The query is scoped
 * to (id + userId) so the action can never flip a notification that belongs
 * to a different user — even if the client lies about the id.
 */
export async function markNotificationReadAction(
  input: z.infer<typeof idSchema>,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "غير مسموح." };

  const rl = await withRateLimit(
    `notif-mark-read:${session.user.id}`,
    240,
    60 * 60 * 1000,
  );
  if (!rl.ok) return { ok: false, error: "تجاوزت الحد المسموح." };

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات غير صالحة." };

  await prisma.notification.updateMany({
    where: { id: parsed.data.id, userId: session.user.id, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "غير مسموح." };

  const rl = await withRateLimit(
    `notif-mark-all:${session.user.id}`,
    30,
    60 * 60 * 1000,
  );
  if (!rl.ok) return { ok: false, error: "تجاوزت الحد المسموح." };

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return { ok: true };
}
