"use client";

import { useTransition } from "react";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/notifications/actions";
import { Button } from "@/components/ui/button";

export function MarkAllReadButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await markAllNotificationsReadAction();
        })
      }
    >
      {pending ? "جاري الحفظ…" : "تعليم الكل كمقروءة"}
    </Button>
  );
}

export function MarkOneReadLink({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        start(async () => {
          await markNotificationReadAction({ id });
        });
      }}
      className="text-xs font-semibold text-accent hover:underline disabled:opacity-50"
    >
      {pending ? "جاري…" : "تعليم كمقروءة"}
    </button>
  );
}
