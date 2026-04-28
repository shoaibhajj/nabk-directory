import Link from "next/link";
import { Bell } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUnreadCount } from "@/lib/notifications";

/**
 * Server component — renders the bell icon with the unread count for the
 * currently signed-in user. We render nothing for anonymous visitors so the
 * header stays clean for guests browsing the directory.
 *
 * Clicking the bell goes to /notifications (a full page) rather than a
 * dropdown — the page doubles as the "history" view and avoids needing a
 * client-side dropdown that polls for updates.
 */
export async function NotificationBell() {
  const session = await auth();
  if (!session?.user?.id) return null;

  let unread = 0;
  try {
    unread = await getUnreadCount(session.user.id);
  } catch {
    // Silently render zero — a transient DB blip shouldn't break the header.
  }

  return (
    <Link
      href="/notifications"
      aria-label={`الإشعارات${unread > 0 ? ` (${unread} جديدة)` : ""}`}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-secondary hover:text-accent"
    >
      <Bell className="h-5 w-5" />
      {unread > 0 ? (
        <span
          className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-primary-foreground"
          aria-hidden="true"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

// Re-exported so the bell module is the canonical entry point for
// notification-related server data (avoids server components elsewhere
// reaching into prisma directly for the count).
export { prisma as _prismaForBell };
