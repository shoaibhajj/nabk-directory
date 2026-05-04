import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "مسودة", className: "bg-yellow-100 text-yellow-800" },
  PUBLISHED: { label: "منشور", className: "bg-green-100 text-green-800" },
  ARCHIVED: { label: "مؤرشف", className: "bg-gray-100 text-gray-600" },
};

export default async function PdfEditionsPage() {
  await requireAdmin("/admin/pdf/editions");

  const editions = await prisma.pdfEdition.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      city: { select: { nameAr: true } },
      _count: { select: { generationJobs: true } },
    },
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">إصدارات PDF</h1>
        <Link
          href="/admin/pdf/editions/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90"
        >
          + إصدار جديد
        </Link>
      </div>

      {editions.length === 0 ? (
        <p className="text-muted-foreground">لا توجد إصدارات بعد.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-right">
              <tr>
                <th className="px-4 py-3 font-semibold">العنوان</th>
                <th className="px-4 py-3 font-semibold">المدينة</th>
                <th className="px-4 py-3 font-semibold">رقم الإصدار</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3 font-semibold">عمليات التوليد</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {editions.map((ed) => {
                const s = STATUS_LABELS[ed.status] ?? STATUS_LABELS.DRAFT;
                return (
                  <tr key={ed.id} className="hover:bg-secondary/20">
                    <td className="px-4 py-3 font-medium">{ed.titleAr}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ed.city.nameAr}
                    </td>
                    <td className="px-4 py-3 text-center">{ed.editionNumber}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          s.className
                        }`}
                      >
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {ed._count.generationJobs}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/pdf/editions/${ed.id}`}
                        className="font-semibold text-accent hover:underline"
                      >
                        عرض
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
