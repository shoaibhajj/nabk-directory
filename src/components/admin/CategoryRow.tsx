"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminDeleteCategoryAction } from "@/features/admin/categories-actions";
import { CategoryForm, type CategoryFormInitial } from "./CategoryForm";

type ParentOption = { id: string; nameAr: string };

export function CategoryRow({
  initial,
  parents,
  parentName,
  listingCount,
  childCount,
}: {
  initial: CategoryFormInitial;
  parents: ParentOption[];
  parentName: string | null;
  listingCount: number;
  childCount: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function destroy() {
    setError(null);
    start(async () => {
      const res = await adminDeleteCategoryAction({ id: initial.id ?? "" });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <CategoryForm
        mode="edit"
        initial={initial}
        parents={parents}
        onDone={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold">{initial.nameAr}</h3>
            <span className="text-xs text-muted-foreground" dir="ltr">
              {initial.nameEn}
            </span>
            {!initial.isActive && <Badge variant="outline">مُعطَّل</Badge>}
            {parentName && (
              <Badge variant="default">فرعي تحت: {parentName}</Badge>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            <span dir="ltr">/{initial.slug ?? ""}</span>
            <span className="mx-2">·</span>
            <span>{listingCount} عمل</span>
            {childCount > 0 && (
              <>
                <span className="mx-2">·</span>
                <span>{childCount} فرع</span>
              </>
            )}
            <span className="mx-2">·</span>
            <span>ترتيب: {initial.displayOrder}</span>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            تعديل
          </Button>
          {!confirming ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(true)}
            >
              حذف
            </Button>
          ) : (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={destroy}
                disabled={pending}
              >
                {pending ? "…" : "تأكيد"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setConfirming(false);
                  setError(null);
                }}
                disabled={pending}
              >
                إلغاء
              </Button>
            </>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
