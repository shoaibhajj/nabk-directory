/**
 * GET /admin/pdf/editions/[id]/preview
 *
 * Streams the generated PDF inline in the browser (Content-Disposition: inline).
 * Uses isPreview=true so the watermark "مسودة" is stamped on every page.
 *
 * Access: admin only (same session check used elsewhere in /admin).
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadPdfEditionData } from "@/lib/pdf/data-loader";
import { generatePdf } from "@/lib/pdf/generator";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds — PDF generation can be slow

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Auth check
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id: editionId } = await params;

  try {
    // ── Load data (isPreview = true → watermark on every page)
    const input = await loadPdfEditionData(editionId, true);

    // ── Generate
    const result = await generatePdf(input);

    if (!result.ok) {
      return new NextResponse(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const filename = `preview-${input.editionSlug}-${Date.now()}.pdf`;

    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        // inline → opens in browser PDF viewer instead of downloading
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": String(result.buffer.length),
        // Prevent caching of preview PDFs
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[preview-route] Failed to generate preview PDF:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new NextResponse(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
