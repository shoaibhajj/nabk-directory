/**
 * /admin/pdf/editions/[id]/preview
 *
 * A simple page that opens the PDF preview inline in the browser.
 * The actual PDF bytes are served by GET /api/pdf/preview-pdf?id=...
 * which streams with Content-Disposition: inline.
 *
 * Fix: appends ?t=<timestamp> to the iframe src so the browser never
 * serves a stale cached PDF after ads are added/changed.
 */
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("/admin/pdf/editions");
  const { id } = await params;

  const edition = await prisma.pdfEdition.findUnique({
    where: { id },
    select: { id: true, titleAr: true },
  });
  if (!edition) notFound();

  // Append cache-busting timestamp so every page visit forces a fresh PDF
  const ts = Date.now();
  const pdfUrl = `/api/pdf/preview-pdf?id=${id}&t=${ts}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", margin: 0, padding: 0 }}>
      {/* Thin header bar */}
      <div
        style={{
          padding: "8px 16px",
          background: "#1a1a1a",
          color: "#fff",
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <span>معاينة: {edition.titleAr}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <a
            href={pdfUrl}
            download
            style={{
              background: "#01696f",
              color: "#fff",
              padding: "4px 14px",
              borderRadius: 6,
              textDecoration: "none",
              fontSize: 12,
            }}
          >
            ⬇️ تحميل
          </a>
          <a
            href={`/admin/pdf/editions/${id}/ads`}
            style={{
              background: "#333",
              color: "#fff",
              padding: "4px 14px",
              borderRadius: 6,
              textDecoration: "none",
              fontSize: 12,
            }}
          >
            ← إدارة الإعلانات
          </a>
        </div>
      </div>

      {/* PDF iframe — fills remaining height */}
      <iframe
        src={pdfUrl}
        style={{ flex: 1, width: "100%", border: "none" }}
        title={`معاينة ${edition.titleAr}`}
      />
    </div>
  );
}
