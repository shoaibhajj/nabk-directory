/**
 * POST /api/pdf/generate
 *
 * Accepts { editionId, isPreview? } in the JSON body.
 * Generates the PDF, records a PdfGenerationJob, and:
 *   - On success: returns the PDF as application/pdf
 *   - On failure: returns JSON { error }
 *
 * Auth: ADMIN or SUPER_ADMIN only.
 * This runs server-side; the heavy work (react-pdf rendering) is on the Node runtime.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { loadPdfEditionData } from "@/lib/pdf/data-loader";
import { generatePdf } from "@/lib/pdf/generator";
import { AuditAction } from "@prisma/client";

export const runtime = "nodejs";
export const maxDuration = 120; // PDF generation can take up to 2 min

export async function POST(req: NextRequest) {
  // ─ Auth check
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

  // ─ Create job record
  const job = await prisma.pdfGenerationJob.create({
    data: {
      pdfEditionId: editionId,
      status: "PROCESSING",
      isPreview,
    },
  });

  try {
    // ─ Load data
    const input = await loadPdfEditionData(editionId, isPreview);

    // ─ Generate
    const result = await generatePdf(input);

    if (!result.ok) {
      await prisma.pdfGenerationJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errorMessage: result.error,
          generatedAt: new Date(),
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

    // ─ Update job with stats
    await prisma.pdfGenerationJob.update({
      where: { id: job.id },
      data: {
        status: "SUCCEEDED",
        pagesCount: result.pagesCount,
        businessesCount: result.businessesCount,
        outputFileSizeBytes: result.buffer.length,
        generatedAt: new Date(),
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
          businessesCount: result.businessesCount,
          isPreview,
        },
      },
    });

    // ─ Return PDF stream
    const filename = isPreview
      ? `preview-${input.editionSlug}.pdf`
      : `${input.editionSlug}.pdf`;

    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(result.buffer.length),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.pdfGenerationJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorMessage: message, generatedAt: new Date() },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
