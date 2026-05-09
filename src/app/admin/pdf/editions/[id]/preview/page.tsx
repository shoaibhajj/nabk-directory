/**
 * /admin/pdf/editions/[id]/preview
 *
 * Generates a preview (isPreview=true) PDF on demand and streams it
 * directly to the browser. No job is saved to the database.
 *
 * Opens in a new tab via the "فتح معاينة PDF" link in ads/page.tsx.
 */

import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { loadPdfEditionData } from "@/lib/pdf/data-loader";
import { generatePdf } from "@/lib/pdf/generator";

export const dynamic = "force-dynamic";
// PDF generation can take >10 s for large editions
export const maxDuration = 60;

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("/admin/pdf/editions");
  const { id } = await params;

  const edition = await prisma.pdfEdition.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!edition) notFound();

  const input = await loadPdfEditionData(id, true /* isPreview */);
  const result = await generatePdf(input);

  if (!result.ok) {
    // Redirect back with an error query param so the user sees feedback
    redirect(`/admin/pdf/editions/${id}/ads?error=${encodeURIComponent(result.error)}`);
  }

  // Stream the PDF bytes back as an inline PDF response.
  // Next.js App Router supports returning a Response from a page when
  // using route handlers; for a Server Component we use a Route Handler
  // instead. However, since this must be a page route (for the Link href
  // to work), we redirect to a route hand