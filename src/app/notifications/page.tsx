import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { listNotifications } from "@/lib/notifications";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { MarkAllReadButton, MarkOneReadLink } from "./client";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  COMMENT_NEW: "تعليق جديد",
  RATING_NEW: "تقييم جديد",
  VIEW_MILESTONE: "إنجاز مشاهدات",
  CONTACT_REPLY: "ردّ على رسالتك",
  LISTING_APPROVED: "تم اعتماد عملك",
  LISTING_REJECTED: "تحتاج مراجعة",
  LISTING_SUSPENDED: "تم إيقاف عملك",
  LISTING_RESTORED: "تم استعادة عملك",
};

function targetHref(
  entityType: string | null,
  entityId: string | null,
): string | null {
  if (!entityType || !entityId) return null;
  if (entityType === "BusinessProfile") return `/businesses/${entityId}`;
  if (entityType === "ContactMessage") return `/contact/my-messages`;
  return null;
}

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/notifications");

  const items = await listNotifications(session.user.id, { limit: 50 });
  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">الإشعارات</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0
                ? `لديك ${unreadCount.toLocaleString("ar-EG")} إشعارات غير مقروءة`
                : "لا توجد إشعارات جديدة"}
            </p>
          </div>
          {unreadCount > 0 ? <MarkAllReadButton /> : null}
        </div>

        {items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              لا توجد إشعارات بعد. ستظهر هنا عند تلقّيك تعليقات أو تقييمات أو
              تحديثات على أعمالك.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {items.map((n) => {
              const href = targetHref(n.relatedEntityType, n.relatedEntityId);
              const Inner = (
                <Card
                  className={
                    n.isRead
                      ? "border-border"
                      : "border-primary/40 bg-primary/5 shadow-sm"
                  }
                >
                  <CardContent className="space-y-1 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-accent">
                        {TYPE_LABEL[n.type] ?? n.type}
                      </span>
                      <time className="text-xs text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString("ar-EG", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </time>
                    </div>
                    <h3 className="text-base font-semibold text-foreground">
                      {n.titleAr}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {n.messageAr}
                    </p>
                    {!n.isRead ? (
                      <div className="pt-2">
                        <MarkOneReadLink id={n.id} />
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
              return (
                <li key={n.id}>
                  {href ? (
                    <Link href={href} className="block hover:opacity-90">
                      {Inner}
                    </Link>
                  ) : (
                    Inner
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
}
