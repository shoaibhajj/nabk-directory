import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const NAV = [
  { href: "/admin", label: "نظرة عامة" },
  { href: "/admin/businesses", label: "الأعمال" },
  { href: "/admin/comments", label: "التعليقات" },
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="border-b border-border bg-secondary/40">
        <nav className="container mx-auto flex flex-wrap gap-4 px-4 py-3 text-sm">
          {NAV.map((n) => (
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
