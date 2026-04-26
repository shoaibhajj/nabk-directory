import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function EditListingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/sign-in?callbackUrl=/dashboard/listings/${id}/edit/basics`);

  const listing = await prisma.businessProfile.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, ownerId: true, nameAr: true, status: true, suspensionReason: true },
  });
  if (!listing) notFound();

  const isOwner = listing.ownerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isOwner && !isAdmin) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-accent"
            >
              ← العودة إلى لوحة التحكم
            </Link>
            <div className="mt-2 flex items-center gap-3">
              <h1 className="text-2xl font-bold">{listing.nameAr}</h1>
              <StatusBadge status={listing.status} />
            </div>
            {listing.status === "REJECTED" && listing.suspensionReason && (
              <p className="mt-2 text-sm text-red-700">
                سبب الرفض: {listing.suspensionReason}
              </p>
            )}
          </div>
        </div>
        {children}
      </section>
      <Footer />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") return <Badge variant="accent">منشور</Badge>;
  if (status === "PENDING") return <Badge variant="warning">قيد المراجعة</Badge>;
  if (status === "SUSPENDED") return <Badge variant="destructive">معلّق</Badge>;
  if (status === "REJECTED") return <Badge variant="destructive">مرفوض</Badge>;
  return <Badge variant="outline">مسودة</Badge>;
}
