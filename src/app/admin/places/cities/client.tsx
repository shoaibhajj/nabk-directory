"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCityAction,
  updateCityAction,
  deleteCityAction,
} from "@/features/admin/places-actions";

type CountryOption = { id: string; nameAr: string };

type EditInitial = {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  isActive: boolean;
  countryId: string;
  listingCount: number;
};

type Props =
  | { mode: "create"; initial?: undefined; countries: CountryOption[] }
  | { mode: "edit"; initial: EditInitial; countries: CountryOption[] };

export function CitiesAdminClient(props: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(props.mode === "create");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nameAr, setNameAr] = useState(props.initial?.nameAr ?? "");
  const [nameEn, setNameEn] = useState(props.initial?.nameEn ?? "");
  const [slug, setSlug] = useState(props.initial?.slug ?? "");
  const [isActive, setIsActive] = useState(props.initial?.isActive ?? true);
  const [countryId, setCountryId] = useState(
    props.initial?.countryId ?? props.countries[0]?.id ?? "",
  );

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
              const res = await deleteCityAction(props.initial.id);
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
        countryId,
        nameAr,
        nameEn,
        slug: slug.trim() || undefined,
        isActive,
      };
      const res =
        props.mode === "edit"
          ? await updateCityAction({ id: props.initial.id, ...payload })
          : await createCityAction(payload);
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
      <div>
        <Label htmlFor={`ci-country-${props.mode}`}>البلد</Label>
        <select
          id={`ci-country-${props.mode}`}
          value={countryId}
          onChange={(e) => setCountryId(e.target.value)}
          disabled={pending}
          className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {props.countries.map((co) => (
            <option key={co.id} value={co.id}>
              {co.nameAr}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`ci-nameAr-${props.mode}`}>الاسم بالعربية</Label>
          <Input
            id={`ci-nameAr-${props.mode}`}
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            placeholder="مثال: النبك"
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor={`ci-nameEn-${props.mode}`}>الاسم بالإنجليزية</Label>
          <Input
            id={`ci-nameEn-${props.mode}`}
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder="Example: Al-Nabk"
            dir="ltr"
            disabled={pending}
          />
        </div>
      </div>
      <div>
        <Label htmlFor={`ci-slug-${props.mode}`}>المعرّف (اختياري)</Label>
        <Input
          id={`ci-slug-${props.mode}`}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="al-nabk"
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
          disabled={
            pending ||
            !countryId ||
            nameAr.trim().length < 2 ||
            nameEn.trim().length < 2
          }
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
