"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  adminApproveBusinessAction,
  adminRejectBusinessAction,
  adminRestoreBusinessAction,
} from "@/features/admin/businesses-actions";

type Status = "DRAFT" | "ACTIVE" | "SUSPENDED";

export function BusinessActions({
  businessId,
  status,
}: {
  businessId: string;
  status: Status;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"reject" | "suspend" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function approve() {
    setError(null);
    start(async () => {
      const res = await adminApproveBusinessAction({ businessId });
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function restore() {
    setError(null);
    start(async () => {
      const res = await adminRestoreBusinessAction({ businessId });
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function submitReason() {
    if (reason.trim().length < 3) {
      setError("السبب يجب أن يكون 3 أحرف على الأقل.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await adminRejectBusinessAction({ businessId, reason });
      if (!res.ok) {
        setError(res.error);
      } else {
        setMode(null);
        setReason("");
        router.refresh();
      }
    });
  }

  if (mode) {
    return (
      <div className="space-y-2">
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            mode === "reject"
              ? "اكتب سبب الرفض (سيُرسل لصاحب العمل)..."
              : "اكتب سبب الإيقاف..."
          }
          rows={3}
          maxLength={500}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={submitReason}
            disabled={pending}
          >
            {pending ? "جارٍ الإرسال..." : "تأكيد"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMode(null);
              setReason("");
              setError(null);
            }}
            disabled={pending}
          >
            إلغاء
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "DRAFT" ? (
        <>
          <Button
            variant="primary"
            size="sm"
            onClick={approve}
            disabled={pending}
          >
            {pending ? "..." : "اعتماد"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMode("reject")}
            disabled={pending}
          >
            رفض
          </Button>
        </>
      ) : null}
      {status === "ACTIVE" ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMode("suspend")}
          disabled={pending}
        >
          إيقاف
        </Button>
      ) : null}
      {status === "SUSPENDED" ? (
        <Button
          variant="primary"
          size="sm"
          onClick={restore}
          disabled={pending}
        >
          استعادة
        </Button>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
