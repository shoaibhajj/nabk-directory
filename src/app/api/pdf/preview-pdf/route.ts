/**
 * GET /api/pdf/preview-pdf?id=<editionId>
 *
 * Generates a preview PDF (isPreview=true, watermark on every page)
 * and streams it inline so the browser PDF viewer opens it directly.
 *
 * - No PdfGenerationJob is recorded (preview only, not a final export).
 * - Ads come ONLY from PdfEditionAd (zero edition ads = zero ads in PDF).
 * - Auth: ADMIN or SUPER_ADMIN only.
 */
import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { loadPdfEditionData } from "@/lib/pdf/data-loader";
import { generatePdf } from "@/lib/pdf/generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // ── auth
  try {
    await requireAdmin();
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const editionId = searchParams.get("id");

  if (!editionId) {
    return NextResponse.json({ error: "id مطلوب" }, { status: 400 });
  }

  // ── verify edition exists
  const edition = await prisma.pdfEdition.findUnique({
    where: { id: editionId },
    select: { id: true, slug: true },
  });
  if (!edition) {
    return new NextResponse("Edition not found", { status: 404 });
  }

  try {
    // isPreview=true → watermark + reads only PdfEditionAd entries
    const input = await loadPdfEditionData(editionId, true);
    const result = await generatePdf(input);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const filename = `preview-${edition.slug}.pdf`;

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        // inline → browser PDF viewer, no download dialog
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": String(result.buffer.length),
        "Cache-Control": "no-store, no-cache",
      },
    });
  } catch (err) {
    console.error("[preview-pdf/route] failed:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
