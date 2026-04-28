"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ContactMessageStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  adminUpdateContactStatusAction,
  adminReplyToContactAction,
} from "@/features/support/actions";

const NEXT_STATUS: Array<{
  value: ContactMessageStatus;
  label: string;
  variant: "primary" | "outline" | "ghost";
}> = [
  { value: "READ", label: "تعليم كمقروءة", variant: "outline" },
  { value: "RESOLVED", label: "إغلاق", variant: "primary" },
  { value: "SPAM", label: "إزعاج", variant: "ghost" },
];

export function ContactMessageActions({
  id,
  currentStatus,
  email,
  subject,
  existingReply,
}: {
  id: string;
  currentStatus: ContactMessageStatus;
  email: string;
  subject: string | null;
  existingReply: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showReply, setShowReply] = useState(false);
  const [reply, setReply] = useState(existingReply ?? "");
  const [success, setSuccess] = useState<string | null>(null);

  function update(status: ContactMessageStatus) {
    setError(null);
    setSuccess(null);
    start(async () => {
      const res = await adminUpdateContactStatusAction({ id, status });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function sendReply() {
    setError(null);
    setSuccess(null);
    start(async () => {
      const res = await adminReplyToContactAction({ id, reply });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess("تم إرسال الردّ.");
      setShowReply(false);
      router.refresh();
    });
  }

  // Fallback: open the admin's mail client (used only if Resend is down or
  // the admin prefers email — the in-app reply is the primary path).
  const replySubject = encodeURIComponent(
    `رد: ${subject ?? "رسالتك إلى دليل النبك"}`,
  );
  const mailto = `mailto:${email}?subject=${replySubject}`;

  return (
    <div className="flex w-full flex-col items-stretch gap-2 md:max-w-xs md:items-end">
      <div className="flex flex-wrap justify-end gap-1">
        <Button
          type="button"
          size="sm"
          variant="accent"
          disabled={pending}
          onClick={() => {
            setShowReply((v) => !v);
            setError(null);
            setSuccess(null);
          }}
        >
          {showReply ? "إلغاء" : existingReply ? "تعديل الردّ" : "ردّ"}
        </Button>
        {NEXT_STATUS.filter((s) => s.value !== currentStatus).map((s) => (
          <Button
            key={s.value}
            type="button"
            size="sm"
            variant={s.variant}
            disabled={pending}
            onClick={() => update(s.value)}
          >
            {s.label}
          </Button>
        ))}
      </div>
      <a href={mailto} className="text-xs font-semibold text-accent underline">
        أو الرد عبر البريد مباشرة
      </a>

      {showReply ? (
        <div className="w-full space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
          <Textarea
            rows={5}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="اكتب الردّ هنا… سيُرسل بالبريد للمستخدم وسيظهر في «رسائلي»."
            maxLength={4000}
            disabled={pending}
          />
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{reply.length} / 4000</span>
            <Button
              type="button"
              size="sm"
              variant="primary"
              disabled={pending || reply.trim().length < 2}
              onClick={sendReply}
            >
              {pending ? "جارٍ الإرسال…" : "إرسال الردّ"}
            </Button>
          </div>
        </div>
      ) : null}

      {pending && !showReply ? (
        <p className="text-xs text-muted-foreground">جارٍ الحفظ…</p>
      ) : null}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {success && <p className="text-xs text-primary">{success}</p>}
      {existingReply && !showReply ? (
        <p className="rounded-md bg-primary/5 px-2 py-1 text-xs text-primary">
          ✓ تم الردّ سابقاً
        </p>
      ) : null}
    </div>
  );
}
