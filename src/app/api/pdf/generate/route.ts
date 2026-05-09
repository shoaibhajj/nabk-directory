/**
 * POST /api/pdf/generate
 *
 * Accepts { editionId, isPreview? } in the JSON body.
 * Generates the PDF, records a PdfGenerationJob, and:
 *   - isPreview=false → Content-Disposition: attachment (download)
 *   - isPreview=true  → Content-Disposition: inline (opens in browser tab)
 *
 * Auth: ADMIN or SUPER_ADMIN only.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { loadPdfEditionData } from "@/lib/pdf/data-loader";
import { generatePdf } from "@/lib/pdf/generator";
import { AuditAction } from "@prisma/client";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { editionId, isPreview = false } = body as {
    editionId?: string;
    isPreview?: boolean;
  };

  if (!editionId) {
    return NextResponse.json({ error: "editionId مطلوب" }, { status: 400 });
  }

  // Create job record
  const job = await prisma.pdfGenerationJob.create({
    data: {
      editionId,
      status: "PROCESSING",
      startedAt: new Date(),
    },
  });

  try {
    const input = await loadPdfEditionData(editionId, isPreview);
    const result = await generatePdf(input);

    if (!result.ok) {
      await prisma.pdfGenerationJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errorMessage: result.error,
          finishedAt: new Date(),
        },
      });
      await prisma.auditLog.create({
        data: {
          actorId: session.user.id,
          actorEmail: session.user.email ?? "",
          actorRole: session.user.role,
          action: AuditAction.PDF_GENERATION_FAILED,
          entityType: "PdfEdition",
          entityId: editionId,
          newValues: { error: result.error },
        },
      });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    await prisma.pdfGenerationJob.update({
      where: { id: job.id },
      data: {
        status: "SUCCEEDED",
        pagesCount: result.pagesCount,
        fileSizeBytes: result.buffer.length,
        finishedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        actorEmail: session.user.email ?? "",
        actorRole: session.user.role,
        action: AuditAction.PDF_GENERATION_SUCCEEDED,
        entityType: "PdfEdition",
        entityId: editionId,
        newValues: {
          jobId: job.id,
          pagesCount: result.pagesCount,
          isPreview,
        },
      },
    });

    const filename = isPreview
      ? `preview-${input.editionSlug}.pdf`
      : `${input.editionSlug}.pdf`;

    // isPreview → inline (opens in browser); final → attachment (download)
    const disposition = isPreview
      ? `inline; filename="${filename}"`
      : `attachment; filename="${filename}"`;

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
        "Content-Length": String(result.buffer.length),
        ...(isPreview ? { "Cache-Control": "no-store" } : {}),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.pdfGenerationJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorMessage: message, finishedAt: new Date() },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
