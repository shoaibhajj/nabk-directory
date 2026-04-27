import { Card, CardContent } from "@/components/ui/card";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { CategoryRow } from "@/components/admin/CategoryRow";
import { getAdminCategories } from "@/features/admin/queries";

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();
  const parents = categories
    .filter((c) => c.parentId === null)
    .map((c) => ({ id: c.id, nameAr: c.nameAr }));

  // Build a stable display order: every top-level row followed by its
  // children, so the admin sees the public navigation hierarchy at a glance.
  const tops = categories.filter((c) => c.parentId === null);
  const childrenByParent = new Map<string, typeof categories>();
  for (const c of categories) {
    if (!c.parentId) continue;
    const arr = childrenByParent.get(c.parentId) ?? [];
    arr.push(c);
    childrenByParent.set(c.parentId, arr);
  }
  const sorted: typeof categories = [];
  for (const t of tops) {
    sorted.push(t);
    const kids = childrenByParent.get(t.id) ?? [];
    for (const k of kids) sorted.push(k);
  }
  // Surface any orphaned children (parent missing) at the bottom so they
  // don't disappear from the admin UI silently.
  const accountedIds = new Set(sorted.map((s) => s.id));
  for (const c of categories) {
    if (!accountedIds.has(c.id)) sorted.push(c);
  }

  const parentNameById = new Map(tops.map((t) => [t.id, t.nameAr]));

  return (
    <section className="container mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold">إدارة التصنيفات</h1>
      <p className="mt-1 text-muted-foreground">
        أضف، عدّل، أو احذف تصنيفات الأعمال. لا يمكن حذف تصنيف يحوي أعمالاً أو
        تصنيفات فرعية.
      </p>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-bold">إضافة تصنيف جديد</h2>
        <CategoryForm
          mode="create"
          parents={parents}
          initial={{
            nameAr: "",
            nameEn: "",
            parentId: null,
            icon: null,
            displayOrder: 0,
            isActive: true,
          }}
        />
      </div>

      <div className="mt-8 space-y-3">
        <h2 className="text-lg font-bold">
          التصنيفات الحالية ({categories.length})
        </h2>
        {sorted.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              لا توجد تصنيفات بعد.
            </CardContent>
          </Card>
        ) : (
          sorted.map((c) => (
            <CategoryRow
              key={c.id}
              initial={{
                id: c.id,
                nameAr: c.nameAr,
                nameEn: c.nameEn,
                parentId: c.parentId,
                icon: c.icon,
                displayOrder: c.displayOrder,
                isActive: c.isActive,
              }}
              parents={parents}
              parentName={c.parentId ? parentNameById.get(c.parentId) ?? null : null}
              listingCount={c._count.listings}
              childCount={c._count.children}
            />
          ))
        )}
      </div>
    </section>
  );
}
