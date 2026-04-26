"use client";

import { useActionState, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/features/businesses/mutations";

interface CategoryFormProps {
  id: string;
  action: (
    prev: ActionResult | undefined,
    formData: FormData,
  ) => Promise<ActionResult>;
  initial: {
    categoryId: string;
    subcategoryId: string | null;
    cityId: string;
    addressAr: string;
    latitude: number | null;
    longitude: number | null;
  };
  topCategories: { id: string; nameAr: string }[];
  subcategories: { id: string; nameAr: string; parentId: string | null }[];
  cities: { id: string; nameAr: string }[];
}

export function CategoryForm({
  id,
  action,
  initial,
  topCategories,
  subcategories,
  cities,
}: CategoryFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const error = state && !state.ok ? state.error : null;
  const saved = state && state.ok;
  const [categoryId, setCategoryId] = useState(initial.categoryId);

  const filteredSubs = useMemo(
    () => subcategories.filter((s) => s.parentId === categoryId),
    [subcategories, categoryId],
  );

  return (
    <form action={formAction} noValidate>
      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="categoryId">التصنيف الرئيسي *</Label>
              <select
                id="categoryId"
                name="categoryId"
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="flex h-12 w-full rounded-full bg-input px-5 py-2 text-base shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                {topCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subcategoryId">التصنيف الفرعي (اختياري)</Label>
              <select
                id="subcategoryId"
                name="subcategoryId"
                defaultValue={initial.subcategoryId ?? ""}
                disabled={filteredSubs.length === 0}
                className="flex h-12 w-full rounded-full bg-input px-5 py-2 text-base shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:opacity-50"
              >
                <option value="">— لا يوجد —</option>
                {filteredSubs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameAr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cityId">المدينة *</Label>
            <select
              id="cityId"
              name="cityId"
              required
              defaultValue={initial.cityId}
              className="flex h-12 w-full rounded-full bg-input px-5 py-2 text-base shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="addressAr">العنوان التفصيلي</Label>
            <Textarea
              id="addressAr"
              name="addressAr"
              rows={3}
              defaultValue={initial.addressAr}
              placeholder="شارع الكورنيش، مقابل البلدية"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="latitude">خط العرض (اختياري)</Label>
              <Input
                id="latitude"
                name="latitude"
                type="number"
                step="any"
                defaultValue={initial.latitude ?? ""}
                placeholder="34.0265"
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="longitude">خط الطول (اختياري)</Label>
              <Input
                id="longitude"
                name="longitude"
                type="number"
                step="any"
                defaultValue={initial.longitude ?? ""}
                placeholder="36.7244"
                dir="ltr"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-emerald-700">تم الحفظ ✓</p>}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="submit" variant="outline" size="md" disabled={pending}>
              حفظ
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={pending}
              name="_next"
              value={`/dashboard/listings/${id}/edit/contact`}
            >
              حفظ ومتابعة →
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
