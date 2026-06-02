"use client";

import { BadgeCheck } from "lucide-react";
import { useState } from "react";

interface Props {
  /** "sm" → card size · "md" → profile page size */
  size?: "sm" | "md";
}

export function VerifiedBadge({ size = "sm" }: Props) {
  const [open, setOpen] = useState(false);

  const isSm = size === "sm";

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label="توضيح حالة التوثيق"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className={[
          "inline-flex items-center gap-1 rounded-full font-semibold select-none",
          "bg-emerald-50 text-emerald-700 border border-emerald-200",
          "dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
          "transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900",
          isSm ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        ].join(" ")}
      >
        <BadgeCheck
          className={isSm ? "h-3.5 w-3.5" : "h-4 w-4"}
          aria-hidden="true"
        />
        موثق
      </button>

      {/* Tooltip */}
      {open && (
        <span
          role="tooltip"
          className={[
            "absolute z-50 w-56 rounded-xl border border-border bg-popover p-3 shadow-lg",
            "text-right text-xs leading-relaxed text-popover-foreground",
            isSm
              ? "bottom-full mb-2 right-0"
              : "top-full mt-2 right-0",
          ].join(" ")}
        >
          <p className="mb-1 font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            <BadgeCheck className="h-3.5 w-3.5" />
            حساب موثق
          </p>
          <p className="text-muted-foreground">
            تم التحقق من هوية صاحب هذا النشاط ودقة المعلومات الواردة من قبل فريق دليل النبك.
          </p>
          {/* small caret */}
          <span
            className={[
              "absolute right-4 h-2 w-2 rotate-45 border bg-popover",
              isSm
                ? "top-full -translate-y-1/2 border-b border-r border-border"
                : "bottom-full translate-y-1/2 border-t border-l border-border",
            ].join(" ")}
          />
        </span>
      )}
    </span>
  );
}
