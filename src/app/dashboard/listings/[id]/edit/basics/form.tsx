"use client";

import { useActionState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/features/businesses/mutations";

interface BasicsFormProps {
  id: string;
  action: (
    prev: ActionResult | undefined,
    formData: FormData,
  ) => Promise<ActionResult>;
  initial: {
    nameAr: string;
    nameEn: string;
    descriptionAr: string;
    descriptionEn: string;
  };
}

export function BasicsForm({ id, action, initial }: BasicsFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const error = state && !state.ok ? state.error : null;
  const saved = state && state.ok;

  return (
    <form action={formAction} noValidate>
      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nameAr">اسم العمل (عربي) *</Label>
              <Input
                id="nameAr"
                name="nameAr"
                required
                defaultValue={initial.nameAr}
                placeholder="صيدلية الشفاء"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nameEn">اسم العمل (إنكليزي) *</Label>
              <Input
                id="nameEn"
                name="nameEn"
                required
                minLength={2}
                pattern="[A-Za-z0-9][A-Za-z0-9\s.,'&\-]+"
                defaultValue={initial.nameEn}
                placeholder="Al-Shifa Pharmacy"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                يُستخدم لإنشاء رابط الصفحة (مثال: /businesses/al-shifa-pharmacy)
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descriptionAr">وصف العمل (عربي)</Label>
            <Textarea
              id="descriptionAr"
              name="descriptionAr"
              rows={5}
              defaultValue={initial.descriptionAr}
              placeholder="وصف موجز يشرح الخدمات التي تقدمها"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descriptionEn">Description (English)</Label>
            <Textarea
              id="descriptionEn"
              name="descriptionEn"
              rows={4}
              defaultValue={initial.descriptionEn}
              dir="ltr"
            />
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
              value={`/dashboard/listings/${id}/edit/category`}
            >
              حفظ ومتابعة →
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
