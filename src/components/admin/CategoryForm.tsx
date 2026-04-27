"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adminCreateCategoryAction,
  adminUpdateCategoryAction,
} from "@/features/admin/categories-actions";

type Mode = "create" | "edit";

type ParentOption = { id: string; nameAr: string };

export type CategoryFormInitial = {
  id?: string;
  slug?: string;
  nameAr: string;
  nameEn: string;
  parentId: string | null;
  icon: string | null;
  displayOrder: number;
  isActive: boolean;
};

export function CategoryForm({
  mode,
  initial,
  parents,
  onDone,
}: {
  mode: Mode;
  initial: CategoryFormInitial;
  parents: ParentOption[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nameAr, setNameAr] = useState(initial.nameAr);
  const [nameEn, setNameEn] = useState(initial.nameEn);
  const [parentId, setParentId] = useState<string>(initial.parentId ?? "");
  const [icon, setIcon] = useState(initial.icon ?? "");
  const [displayOrder, setDisplayOrder] = useState(String(initial.displayOrder));
  const [isActive, setIsActive] = useState(initial.isActive);

  function submit() {
    setError(null);
    start(async () => {
      const payload = {
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim(),
        parentId: parentId ? parentId : null,
        icon: icon.trim() ? icon.trim() : null,
        displayOrder: Number(displayOrder) || 0,
        isActive,
      };
      const res =
        mode === "create"
          ? await adminCreateCategoryAction(payload)
          : await adminUpdateCategoryAction({
              id: initial.id ?? "",
              ...payload,
            });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (mode === "create") {
        setNameAr("");
        setNameEn("");
        setParentId("");
        setIcon("");
        setDisplayOrder("0");
        setIsActive(true);
      }
      onDone?.();
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor={`nameAr-${mode}-${initial.id ?? "new"}`}>الاسم بالعربية</Label>
          <Input
            id={`nameAr-${mode}-${initial.id ?? "new"}`}
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            maxLength={80}
            required
          />
        </div>
        <div>
          <Label htmlFor={`nameEn-${mode}-${initial.id ?? "new"}`}>الاسم بالإنجليزية</Label>
          <Input
            id={`nameEn-${mode}-${initial.id ?? "new"}`}
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            maxLength={80}
            dir="ltr"
            pattern="[A-Za-z0-9 \-_/&]+"
            required
          />
        </div>
        <div>
          <Label htmlFor={`parent-${mode}-${initial.id ?? "new"}`}>التصنيف الرئيسي</Label>
          <select
            id={`parent-${mode}-${initial.id ?? "new"}`}
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">— تصنيف رئيسي مستقل —</option>
            {parents
              .filter((p) => p.id !== initial.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nameAr}
                </option>
              ))}
          </select>
        </div>
        <div>
          <Label htmlFor={`icon-${mode}-${initial.id ?? "new"}`}>أيقونة (اختياري)</Label>
          <Input
            id={`icon-${mode}-${initial.id ?? "new"}`}
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            maxLength={40}
            dir="ltr"
            placeholder="utensils, store, …"
          />
        </div>
        <div>
          <Label htmlFor={`order-${mode}-${initial.id ?? "new"}`}>ترتيب العرض</Label>
          <Input
            id={`order-${mode}-${initial.id ?? "new"}`}
            type="number"
            min={0}
            max={9999}
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4"
            />
            مُفعَّل (يظهر للعموم)
          </label>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={submit} disabled={pending}>
          {pending ? "جارٍ الحفظ…" : mode === "create" ? "إضافة تصنيف" : "حفظ التعديلات"}
        </Button>
        {mode === "edit" && onDone ? (
          <Button variant="ghost" size="sm" onClick={onDone} disabled={pending}>
            إلغاء
          </Button>
        ) : null}
      </div>
    </div>
  );
}
