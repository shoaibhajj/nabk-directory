import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

type NavItem = { href: string; label: string; superAdminOnly?: boolean };

const NAV: NavItem[] = [
  { href: "/admin", label: "نظرة عامة" },
  { href: "/admin/businesses", label: "الأعمال" },
  { href: "/admin/comments", label: "التعليقات" },
  { href: "/admin/categories", label: "التصنيفات" },
  { href: "/admin/users", label: "المستخدمون", superAdminOnly: true },
  { href: "/admin/audit", label: "سجل التدقيق" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin");
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const isSuper = session.user.role === "SUPER_ADMIN";
  const visibleNav = NAV.filter((n) => !n.superAdminOnly || isSuper);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="border-b border-border bg-secondary/40">
        <nav className="container mx-auto flex flex-wrap gap-4 px-4 py-3 text-sm">
          {visibleNav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-full px-3 py-1 font-semibold text-foreground hover:bg-background hover:text-accent"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
      <Footer />
    </div>
  );
}
