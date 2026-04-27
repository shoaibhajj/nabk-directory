"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ContactMessageStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { adminUpdateContactStatusAction } from "@/features/support/actions";

const NEXT_STATUS: Array<{
  value: ContactMessageStatus;
  label: string;
  variant: "primary" | "outline" | "ghost";
}> = [
  { value: "READ", label: "تعليم كمقروءة", variant: "outline" },
  { value: "RESOLVED", label: "تم الرد", variant: "primary" },
  { value: "SPAM", label: "إزعاج", variant: "ghost" },
];

export function ContactMessageActions({
  id,
  currentStatus,
  email,
  subject,
}: {
  id: string;
  currentStatus: ContactMessageStatus;
  email: string;
  subject: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function update(status: ContactMessageStatus) {
    setError(null);
    start(async () => {
      const res = await adminUpdateContactStatusAction({ id, status });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  // mailto: opens the admin's mail client with the user's address pre-filled,
  // which is the simplest "reply" path without storing email content here.
  const replySubject = encodeURIComponent(
    `رد: ${subject ?? "رسالتك إلى دليل النبك"}`,
  );
  const mailto = `mailto:${email}?subject=${replySubject}`;

  return (
    <div className="flex flex-col items-end gap-2">
      <a href={mailto} className="text-xs font-semibold text-accent underline">
        الرد عبر البريد
      </a>
      <div className="flex flex-wrap justify-end gap-1">
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
      {pending && <p className="text-xs text-muted-foreground">جارٍ الحفظ…</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
