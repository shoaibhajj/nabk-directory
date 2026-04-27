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
  const urlRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleClick() {
    const externalUrl = urlRef.current?.value ?? "";
    if (!externalUrl.trim()) {
      setError("الصق رابط الصورة");
      return;
    }
    const fd = new FormData();
    fd.set("externalUrl", externalUrl);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await uploadPhotoAction(id, undefined, fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      if (urlRef.current) urlRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="space-y-1.5">
          <Label htmlFor="externalUrl">رابط الصورة</Label>
          <Input
            ref={urlRef}
            id="externalUrl"
            name="externalUrl"
            type="url"
            placeholder="https://example.com/photo.jpg"
            dir="ltr"
          />
          <p className="text-xs text-muted-foreground">
            الصق رابط صورة من الإنترنت (مثلاً: من فيسبوك، إنستغرام، أو موقعك). رفع الملفات مباشرة سيتوفر قريباً.
          </p>
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
            {pending ? "جارٍ الإضافة..." : "إضافة"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
