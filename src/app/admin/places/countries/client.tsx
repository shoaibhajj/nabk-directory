"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCountryAction,
  updateCountryAction,
  deleteCountryAction,
} from "@/features/admin/places-actions";

type EditInitial = {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  isActive: boolean;
  cityCount: number;
};

type Props =
  | { mode: "create"; initial?: undefined }
  | { mode: "edit"; initial: EditInitial };

export function CountriesAdminClient(props: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(props.mode === "create");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nameAr, setNameAr] = useState(props.initial?.nameAr ?? "");
  const [nameEn, setNameEn] = useState(props.initial?.nameEn ?? "");
  const [slug, setSlug] = useState(props.initial?.slug ?? "");
  const [isActive, setIsActive] = useState(props.initial?.isActive ?? true);

  if (props.mode === "edit" && !open) {
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen(true)}
        >
          تعديل
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() => {
            if (
              !confirm(`هل تريد حذف «${props.initial.nameAr}»؟ لا يمكن التراجع.`)
            )
              return;
            setError(null);
            start(async () => {
              const res = await deleteCountryAction(props.initial.id);
              if (!res.ok) {
                setError(res.error);
                return;
              }
              router.refresh();
            });
          }}
        >
          حذف
        </Button>
        {error ? (
          <p className="basis-full text-right text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  function submit() {
    setError(null);
    start(async () => {
      const payload = {
        nameAr,
        nameEn,
        slug: slug.trim() || undefined,
        isActive,
      };
      const res =
        props.mode === "edit"
          ? await updateCountryAction({ id: props.initial.id, ...payload })
          : await createCountryAction(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (props.mode === "create") {
        setNameAr("");
        setNameEn("");
        setSlug("");
        setIsActive(true);
      } else {
        setOpen(false);
      }
      router.refresh();
    });
  }

  return (
    <div className="w-full max-w-md space-y-3 rounded-lg border border-border bg-secondary/20 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="c-nameAr">الاسم بالعربية</Label>
          <Input
            id="c-nameAr"
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            placeholder="مثال: سوريا"
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="c-nameEn">الاسم بالإنجليزية</Label>
          <Input
            id="c-nameEn"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder="Example: Syria"
            dir="ltr"
            disabled={pending}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="c-slug">المعرّف (اختياري)</Label>
        <Input
          id="c-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="syria"
          dir="ltr"
          disabled={pending}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          إذا تركته فارغاً سيُولَّد تلقائياً من الاسم الإنجليزي.
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          disabled={pending}
          className="h-4 w-4"
        />
        مفعّل (يظهر في القوائم)
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={pending || nameAr.trim().length < 2 || nameEn.trim().length < 2}
          onClick={submit}
        >
          {pending
            ? "جارٍ الحفظ…"
            : props.mode === "edit"
              ? "حفظ التغييرات"
              : "إضافة"}
        </Button>
        {props.mode === "edit" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            إلغاء
          </Button>
        ) : null}
      </div>
    </div>
  );
}
