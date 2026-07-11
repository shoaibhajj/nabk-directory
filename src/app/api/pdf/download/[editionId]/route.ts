/**
 * GET /api/pdf/download/[editionId]
 *
 * Public proxy — no auth required.
 * Fetches PDF from Cloudinary server-side (bypasses "untrusted customer" block)
 * and streams it as a forced attachment download.
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

  // Fetch from Cloudinary on the server — no CORS / untrusted-customer block here
  const upstream = await fetch(fileUrl, {
    headers: { Accept: "application/pdf" },
  });

  if (!upstream.ok) {
    return new NextResponse(
      `Failed to fetch file: ${upstream.status}`,
      { status: 502 },
    );
  }

  const buffer = await upstream.arrayBuffer();
  const filename = `${edition.titleAr}.pdf`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      // attachment — forces Save As dialog in the browser
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
