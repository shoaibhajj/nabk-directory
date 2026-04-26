"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminApproveCommentAction,
  adminHideCommentAction,
} from "@/features/comments/actions";

type Status = "VISIBLE" | "PENDING_REVIEW" | "HIDDEN_BY_ADMIN" | "DELETED_BY_USER";

export function CommentModerationActions({
  commentId,
  status,
}: {
  commentId: string;
  status: Status;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"hide" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function approve() {
    setError(null);
    start(async () => {
      const res = await adminApproveCommentAction(commentId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function submitHide() {
    if (reason.trim().length < 1) {
      setError("سبب الإخفاء مطلوب.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await adminHideCommentAction({ commentId, reason });
      if (!res.ok) {
        setError(res.error);
      } else {
        setMode(null);
        setReason("");
        router.refresh();
      }
    });
  }

  if (mode === "hide") {
    return (
      <div className="space-y-2">
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="سبب الإخفاء..."
          maxLength={200}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={submitHide}
            disabled={pending}
          >
            {pending ? "..." : "تأكيد الإخفاء"}
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
      {status === "PENDING_REVIEW" ? (
        <Button
          variant="primary"
          size="sm"
          onClick={approve}
          disabled={pending}
        >
          {pending ? "..." : "اعتماد"}
        </Button>
      ) : null}
      {status === "VISIBLE" || status === "PENDING_REVIEW" ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMode("hide")}
          disabled={pending}
        >
          إخفاء
        </Button>
      ) : null}
      {status === "HIDDEN_BY_ADMIN" ? (
        <span className="text-xs text-muted-foreground">
          مخفي — لا يوجد إجراء حالي
        </span>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
