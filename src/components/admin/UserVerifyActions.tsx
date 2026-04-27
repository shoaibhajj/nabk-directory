"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  adminVerifyUserEmailAction,
  adminResendVerificationEmailAction,
} from "@/features/admin/users-actions";

export function UserVerifyActions({ userId }: { userId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  function run(label: string, fn: () => Promise<{ ok: boolean; error?: string } | { ok: true }>) {
    setMsg(null);
    start(async () => {
      const res = await fn();
      if ("ok" in res && res.ok) {
        setMsg({ kind: "ok", text: `${label} ✓` });
        router.refresh();
      } else {
        const error =
          "error" in res && typeof res.error === "string"
            ? res.error
            : "تعذّر التنفيذ";
        setMsg({ kind: "err", text: error });
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            run("تم إعادة إرسال البريد", () =>
              adminResendVerificationEmailAction({ userId }),
            )
          }
        >
          إعادة إرسال البريد
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (
              !window.confirm(
                "تأكيد التفعيل اليدوي للحساب؟ سيتمكن المستخدم من الدخول مباشرةً.",
              )
            ) {
              return;
            }
            run("تم التفعيل", () =>
              adminVerifyUserEmailAction({ userId }),
            );
          }}
        >
          تفعيل الحساب يدوياً
        </Button>
      </div>
      {pending && <p className="text-xs text-muted-foreground">جارٍ التنفيذ…</p>}
      {msg && (
        <p
          className={
            msg.kind === "ok"
              ? "text-xs text-primary"
              : "text-xs text-destructive"
          }
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
