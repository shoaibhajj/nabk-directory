"use client";

import Image from "next/image";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { removePhotoAction } from "@/features/businesses/mutations";

interface PhotoCardProps {
  listingId: string;
  mediaId: string;
  url: string;
  isCover: boolean;
}

export function PhotoCard({ listingId, mediaId, url, isCover }: PhotoCardProps) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-muted">
      {url.startsWith("http") || url.startsWith("/") ? (
        <Image
          src={url}
          alt="صورة العمل"
          width={400}
          height={300}
          className="h-32 w-full object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-32 w-full items-center justify-center text-sm text-muted-foreground">
          صورة
        </div>
      )}
      {isCover && (
        <Badge variant="accent" className="absolute right-2 top-2">الغلاف</Badge>
      )}
      <Button
        type="button"
        variant="destructive"
        size="icon"
        aria-label="حذف"
        disabled={pending}
        className="absolute left-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => {
          if (!confirm("حذف هذه الصورة؟")) return;
          startTransition(async () => {
            await removePhotoAction(listingId, mediaId);
          });
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
