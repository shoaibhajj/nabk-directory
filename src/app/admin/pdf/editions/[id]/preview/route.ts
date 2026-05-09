/**
 * GET /admin/pdf/editions/[id]/preview
 *
 * Streams a draft PDF inline so the browser opens it directly (no download).
 * Uses only the edition-specific ads stored in PdfEditionAd — zero fallback
 * to global ads. isPreview=true stamps "مسودة" watermark on every page.
 *
 * Access: admin only.
 */
import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { loadPdfEditionData } from "@/lib/pdf/data-loader";
import { generatePdf } from "@/lib/pdf/generator";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── auth
  try {
    await requireAdmin();
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id: editionId } = await params;

  // ── verify edition exists
  const edition = await prisma.pdfEdition.findUnique({
    where: { id: editionId },
    select: { id: true, slug: true },
  });
  if (!edition) {
    return new NextResponse("Edition not found", { status: 404 });
  }

  try {
    // isPreview = true → watermark on every page + reads only edition ads
    const input = await loadPdfEditionData(editionId, true);
    const result = await generatePdf(input);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    const filename = `preview-${edition.slug}-${Date.now()}.pdf`;

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        // inline → browser PDF viewer, not a download
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": String(result.buffer.length),
        "Cache-Control": "no-store, no-cache",
      },
    });
  } catch (err) {
    console.error("[preview/route] failed:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
