import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  MapPin,
  Clock,
  Star,
  Eye,
  Share2,
  MessageCircle,
} from "lucide-react";

import { getCategoryIcon } from "@/components/business/category-icons";
import { getBusinessById } from "@/features/businesses/queries";
import { isOpenNow, DAY_NAMES_AR } from "@/lib/working-hours";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  getMyRating,
  getRatingDistribution,
} from "@/features/ratings/queries";
import { getCommentsForBusiness } from "@/features/comments/queries";
import { RatingStars } from "@/components/business/RatingStars";
import { RatingSummary } from "@/components/business/RatingSummary";
import { CommentSection } from "@/components/business/CommentSection";

export default async function BusinessDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ commentsPage?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const business = await getBusinessById(id);
  if (!business) notFound();

  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const isAdmin =
    session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  const ownsBusiness = viewerId !== null && business.owner?.id === viewerId;
  const signInHref = `/sign-in?callbackUrl=/businesses/${business.id}`;

  const commentsPage = Math.max(1, Number.parseInt(sp.commentsPage ?? "1", 10) || 1);
  const [myRating, distribution, comments] = await Promise.all([
    getMyRating(business.id, viewerId),
    getRatingDistribution(business.id),
    getCommentsForBusiness(business.id, viewerId, isAdmin, commentsPage),
  ]);

  // Increment view (non-blocking, ok to await briefly)
  await prisma.businessProfile
    .update({ where: { id }, data: { viewCount: { increment: 1 } } })
    .catch(() => null);

  const status = isOpenNow(business.workingHours);
  const phones = business.phoneNumbers;
  const whatsappPhone = phones.find((p) => p.label === "WHATSAPP")?.number ?? phones[0]?.number;
  const images = business.mediaFiles.filter((m) => m.type === "IMAGE");
  const cover = images[0];
  const CategoryIcon = getCategoryIcon(business.category.slug);
  const initial = business.nameAr.replace(/^(ال|دكتور|د\.|عيادة|مطعم|كافيه|ورشة|سوبرماركت|صيدلية|مدرسة|محل)\s*/, "").trim().charAt(0)
    || business.nameAr.charAt(0);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <article className="container mx-auto px-4 py-8">
        {/* Gradient hero with empty-state category icon when no cover image */}
        {cover ? (
          <div className="relative aspect-[16/6] w-full overflow-hidden rounded-3xl bg-muted">
            <Image
              src={cover.url}
              alt={business.nameAr}
              fill
              className="object-cover"
              sizes="100vw"
            />
          </div>
        ) : (
          <div
            className="relative flex aspect-[16/6] w-full items-center justify-center overflow-hidden rounded-3xl"
            style={{
              background:
                "linear-gradient(135deg, #E7F6E9 0%, #F4F0E6 45%, #FFE9C9 100%)",
            }}
          >
            <CategoryIcon className="h-24 w-24 text-primary/30 md:h-32 md:w-32" />
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-start gap-4">
              {/* Letter-avatar tile (matches reference site) */}
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-muted text-4xl font-bold text-muted-foreground shadow-soft md:h-24 md:w-24">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold md:text-4xl">{business.nameAr}</h1>
                  {status.open ? (
                    <Badge variant="accent">مفتوح الآن</Badge>
                  ) : (
                    <Badge variant="outline">مغلق</Badge>
                  )}
                </div>
                {business.nameEn && (
                  <p className="mt-1 text-sm text-muted-foreground" dir="ltr">
                    {business.nameEn}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <Link href={`/category/${business.category.slug}`}>
                    <Badge variant="default">{business.category.nameAr}</Badge>
                  </Link>
                  {business.ratingCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-4 w-4 fill-[var(--color-star)] text-[var(--color-star)]" />
                      <strong className="text-foreground">{business.ratingAverage.toFixed(1)}</strong>
                      <span>({business.ratingCount} تقييم)</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-4 w-4" /> {business.viewCount.toLocaleString("ar-EG")} مشاهدة
                  </span>
                </div>
              </div>
            </div>

            <Card className="mt-6">
              <CardContent className="space-y-4 p-6">
                <h2 className="text-xl font-bold">عن العمل</h2>
                <p className="whitespace-pre-line text-muted-foreground">
                  {business.descriptionAr ?? "لا يوجد وصف بعد."}
                </p>
              </CardContent>
            </Card>

            {images.length > 1 && (
              <Card className="mt-6">
                <CardContent className="p-6">
                  <h2 className="mb-4 text-xl font-bold">معرض الصور</h2>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {images.slice(1).map((m) => (
                      <div key={m.id} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                        <Image src={m.url} alt="" fill className="object-cover" sizes="33vw" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card id="ratings" className="mt-6 scroll-mt-24">
              <CardContent className="space-y-5 p-6">
                <h2 className="text-xl font-bold">التقييمات</h2>
                <RatingSummary
                  average={business.ratingAverage}
                  count={business.ratingCount}
                  buckets={distribution.buckets}
                />
                <div className="rounded-2xl bg-muted/40 p-4">
                  <h3 className="mb-2 text-sm font-bold">تقييمك</h3>
                  <RatingStars
                    businessId={business.id}
                    initialScore={myRating?.score ?? null}
                    signedIn={viewerId !== null}
                    ownsBusiness={ownsBusiness}
                    signInHref={signInHref}
                  />
                </div>
              </CardContent>
            </Card>

            <Card id="comments" className="mt-6 scroll-mt-24">
              <CardContent className="space-y-5 p-6">
                <h2 className="text-xl font-bold">التعليقات</h2>
                <CommentSection
                  businessId={business.id}
                  page={comments}
                  viewerId={viewerId}
                  isAdmin={isAdmin}
                  signInHref={signInHref}
                />
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-4">
            <Card>
              <CardContent className="space-y-3 p-6">
                <h2 className="text-lg font-bold">تواصل معنا</h2>
                {phones.length > 0 ? (
                  phones.map((p) => (
                    <a
                      key={p.id}
                      href={`tel:${p.number}`}
                      className="flex items-center gap-3 rounded-2xl border border-border p-3 hover:bg-muted"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground">
                          {p.label === "WHATSAPP" ? "واتساب" : p.label === "LANDLINE" ? "أرضي" : p.label === "FAX" ? "فاكس" : "موبايل"}
                        </div>
                        <div dir="ltr" className="font-bold">{p.number}</div>
                      </div>
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">لا توجد أرقام تواصل.</p>
                )}

                {whatsappPhone && (
                  <a
                    href={`https://wa.me/${whatsappPhone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="whatsapp" size="md" className="w-full">
                      <MessageCircle className="h-4 w-4" />
                      مراسلة عبر واتساب
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-6">
                <h2 className="text-lg font-bold">العنوان</h2>
                {business.addressAr ? (
                  <p className="flex items-start gap-2 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 text-accent shrink-0" />
                    <span>{business.addressAr}</span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">العنوان غير محدد.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-6">
                <h2 className="text-lg font-bold">ساعات العمل</h2>
                <ul className="space-y-1.5 text-sm">
                  {DAY_NAMES_AR.map((dayName, i) => {
                    const wh = business.workingHours.find((w) => w.dayOfWeek === i);
                    return (
                      <li key={i} className="flex items-center justify-between">
                        <span className="font-semibold">{dayName}</span>
                        <span className="text-muted-foreground" dir="ltr">
                          {!wh || !wh.isOpen
                            ? "مغلق"
                            : wh.is24Hours
                              ? "24 ساعة"
                              : `${wh.openTime} - ${wh.closeTime}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </aside>
        </div>
      </article>

      <Footer />
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const business = await getBusinessById(id);
  if (!business) return {};
  return {
    title: `${business.nameAr} — دليل النبك`,
    description: business.descriptionAr ?? `${business.nameAr} في النبك`,
  };
}
