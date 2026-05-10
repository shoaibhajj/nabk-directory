/**
 * /admin/pdf/editions/[id]/preview
 *
 * Opens the PDF preview directly in a new browser tab with no admin
 * shell around it.
 *
 * Strategy:
 *   - The layout.tsx sibling strips every ancestor layout so this page
 *     occupies the full viewport.
 *   - We redirect straight to /api/pdf/preview-pdf with
 *     Content-Disposition: inline so the browser PDF viewer handles it
 *     natively — no iframe, no extra click required.
 *   - Cache-busting ?t= timestamp prevents stale PDFs.
 *
 * The redirect happens on the server via Next.js `redirect()` so the
 * browser never even renders this page — it lands immediately on the
 * raw PDF bytes and the OS/browser PDF viewer kicks in.
 */
import { redirect } from "next/navigation";
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
    select: { id: true },
  });
  if (!edition) notFound();

  // Redirect directly to the PDF stream — browser opens it natively.
  // ?t= busts any stale CDN or browser cache.
  redirect(`/api/pdf/preview-pdf?id=${id}&t=${Date.now()}`);
}
