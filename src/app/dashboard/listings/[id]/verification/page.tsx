import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { RequestVerificationForm } from "@/components/business/RequestVerificationForm";
import { getLatestVerificationRequest } from "@/features/businesses/verification-actions";

export default async function VerificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/dashboard");

  const business = await prisma.businessProfile.findUnique({
    where: { id, deletedAt: null },
    select: { id: true, nameAr: true, ownerId: true, verificationStatus: true },
  });

  if (!business || business.ownerId !== session.user.id) notFound();

  const lastRequest = await getLatestVerificationRequest(business.id);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container mx-auto max-w-xl px-4 py-10">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-accent"
          >
            ← العودة للوحة التحكم
          </Link>
          <h1 className="mt-2 text-2xl font-bold">
            توثيق النشاط: {business.nameAr}
          </h1>
        </div>
        <RequestVerificationForm
          businessProfileId={business.id}
          currentStatus={business.verificationStatus}
          lastRequest={lastRequest}
        />
      </section>
      <Footer />
    </div>
  );
}
