"use client";

import { useTransition } from "react";
import { deletePdfAd } from "@/app/actions/pdf-editions";

interface Props {
  adId: string;
  adTitle: string;
}

export function DeleteAdButton({ adId, adTitle }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`حذف الإعلان «${adTitle}»؟\nلا يمكن التراجع عن هذا الإجراء.`)) return;
    startTransition(() => deletePdfAd(adId));
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold
        text-red-600 hover:bg-red-50 disabled:opacity-50
        dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
    >
      {isPending ? "جاري الحذف..." : "سحب / حذف"}
    </button>
  );
}
