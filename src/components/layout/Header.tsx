import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Store, Info, Mail, Inbox } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export async function Header() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-cta">
            <Store className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-lg font-bold text-foreground">دليل النبك</div>
            <div className="text-[11px] text-muted-foreground">كل ما تحتاجه في مدينتك</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/" className="text-sm font-semibold hover:text-accent">
            الرئيسية
          </Link>
          <Link href="/businesses" className="text-sm font-semibold hover:text-accent">
            الدليل
          </Link>
          <Link href="/categories" className="text-sm font-semibold hover:text-accent">
            الأقسام
          </Link>
          <Link href="/about" className="inline-flex items-center gap-1 text-sm font-semibold hover:text-accent">
            <Info className="h-4 w-4" /> عن الدليل
          </Link>
          <Link href="/contact" className="inline-flex items-center gap-1 text-sm font-semibold hover:text-accent">
            <Mail className="h-4 w-4" /> تواصل
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <NotificationBell />
              <Link
                href="/contact/my-messages"
                className="hidden items-center gap-1 text-sm font-semibold text-foreground hover:text-accent md:inline-flex"
                aria-label="رسائلي"
              >
                <Inbox className="h-4 w-4" /> رسائلي
              </Link>
              {user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? (
                <Link href="/admin">
                  <Button variant="ghost" size="sm">
                    الإدارة
                  </Button>
                </Link>
              ) : null}
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  لوحة التحكم
                </Button>
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button type="submit" variant="ghost" size="sm">
                  خروج
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/sign-in" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  دخول
                </Button>
              </Link>
              <Link href="/dashboard/listings/new">
                <Button variant="primary" size="sm">
                  أضف عملك
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
