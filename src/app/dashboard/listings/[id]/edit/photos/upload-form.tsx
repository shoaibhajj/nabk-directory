"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadPhotoAction } from "@/features/businesses/mutations";

export function PhotoUploadForm({ id }: { id: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleClick() {
    const file = fileRef.current?.files?.[0];
    const externalUrl = urlRef.current?.value ?? "";
    if (!file && !externalUrl.trim()) {
      setError("اختر ملف صورة أو الصق رابطاً");
      return;
    }
    const fd = new FormData();
    if (file) fd.set("photo", file);
    if (externalUrl) fd.set("externalUrl", externalUrl);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await uploadPhotoAction(id, undefined, fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      if (fileRef.current) fileRef.current.value = "";
      if (urlRef.current) urlRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="photo">رفع ملف صورة</Label>
              <input
                ref={fileRef}
                id="photo"
                name="photo"
                type="file"
                accept="image/*"
                className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-secondary-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="externalUrl">أو لصق رابط صورة</Label>
              <Input
                ref={urlRef}
                id="externalUrl"
                name="externalUrl"
                type="url"
                placeholder="https://..."
                dir="ltr"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-emerald-700">تمت إضافة الصورة ✓</p>}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={pending}
              onClick={handleClick}
            >
              {pending ? "جارٍ الرفع..." : "إضافة"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
