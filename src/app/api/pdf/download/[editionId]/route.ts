/**
 * GET /api/pdf/download/[editionId]
 *
 * Public route — no auth required.
 * Fetches the PDF from Cloudinary and streams it as an attachment download.
 * This avoids CORS issues when the browser tries to fetch Cloudinary directly.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPublishedEditionById } from "@/features/pdf/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ editionId: string }> },
) {
  const { editionId } = await params;

  const edition = await getPublishedEditionById(editionId);
  if (!edition) {
    return new NextResponse("Not found", { status: 404 });
  }

  const fileUrl = edition.generationJobs[0]?.outputFileUrl ?? null;
  if (!fileUrl) {
    return new NextResponse("File not available", { status: 404 });
  }

  // Fetch from Cloudinary server-side (no CORS restriction here)
  const upstream = await fetch(fileUrl);
  if (!upstream.ok) {
    return new NextResponse("Failed to fetch file", { status: 502 });
  }

  const buffer = await upstream.arrayBuffer();
  const filename = `${edition.titleAr}.pdf`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "public, max-age=86400",
    },
  });
}
