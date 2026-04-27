"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { softDeleteListingAction } from "@/features/businesses/mutations";

interface DeleteListingButtonProps {
  listingId: string;
  listingName: string;
}

export function DeleteListingButton({
  listingId,
  listingName,
}: DeleteListingButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, start] = useTransition();

  const expected = listingName.trim();
  const matches = confirmation.trim() === expected && expected.length > 0;

  function reset() {
    setOpen(false);
    setConfirmation("");
  }

  function handleDelete() {
    if (!matches) {
      toast.error("اكتب اسم العمل بالضبط للتأكيد");
      return;
    }
    start(async () => {
      const res = await softDeleteListingAction(listingId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`تم حذف ${listingName}`);
      reset();
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={`حذف ${listingName}`}
      >
        <Trash2 className="h-4 w-4" />
        حذف
      </Button>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="تأكيد حذف العمل"
      className="w-full space-y-3 rounded-2xl border border-destructive/30 bg-red-50 p-3"
    >
      <p className="text-sm text-red-800">
        هذا الإجراء سيحذف <strong>{listingName}</strong> من الدليل العام
        ولوحة التحكم. للتأكيد، اكتب اسم العمل أدناه:
      </p>
      <div className="space-y-1.5">
        <Label htmlFor={`delete-confirm-${listingId}`} className="text-xs">
          اسم العمل للتأكيد
        </Label>
        <Input
          id={`delete-confirm-${listingId}`}
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder={listingName}
          autoComplete="off"
          disabled={pending}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={pending || !matches}
        >
          {pending ? "جارٍ الحذف..." : "تأكيد الحذف"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={reset}
          disabled={pending}
        >
          إلغاء
        </Button>
      </div>
    </div>
  );
}
