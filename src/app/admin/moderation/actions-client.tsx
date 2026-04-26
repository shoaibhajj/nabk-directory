"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  approveListingAction,
  rejectListingAction,
} from "@/features/businesses/mutations";

export function ModerationActions({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await approveListingAction(id);
              if (!res.ok) setError(res.error);
            });
          }}
        >
          ✓ موافقة ونشر
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => setShowReject((v) => !v)}
        >
          رفض
        </Button>
      </div>
      {showReject && (
        <div className="space-y-2 rounded-2xl bg-muted p-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="سبب الرفض (يظهر للمالك)..."
            className="w-full rounded-xl bg-background p-2 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowReject(false)}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={pending || reason.trim().length < 3}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const res = await rejectListingAction(id, reason);
                  if (!res.ok) setError(res.error);
                  else setShowReject(false);
                });
              }}
            >
              تأكيد الرفض
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
