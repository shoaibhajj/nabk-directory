/**
 * /admin/pdf/editions/new
 * Server Component shell — Tiptap editor lives in NewEditionForm (Client Component)
 */
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { NewEditionForm } from "./_components/new-edition-form";

export default async function NewPdfEditionPage() {
  await requireAdmin("/admin/pdf/editions/new");

  const cities = await prisma.city.findMany({
    where: { isActive: true },
    orderBy: { nameAr: "asc" },
  });

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">إنشاء إصدار PDF جديد</h1>
      <NewEditionForm cities={cities} />
    </main>
  );
}
