"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { adminChangeUserRoleAction } from "@/features/admin/users-actions";

const ROLE_LABELS: Record<Role, string> = {
  GUEST: "زائر",
  BUSINESS_OWNER: "صاحب عمل",
  ADMIN: "مسؤول",
  SUPER_ADMIN: "مسؤول أعلى",
};

const ASSIGNABLE = ["BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"] as const;
type AssignableRole = (typeof ASSIGNABLE)[number];

function isAssignable(r: Role): r is AssignableRole {
  return r === "BUSINESS_OWNER" || r === "ADMIN" || r === "SUPER_ADMIN";
}

export function UserRoleSelect({
  userId,
  currentRole,
  disabled,
  disabledReason,
}: {
  userId: string;
  currentRole: Role;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  // GUEST is not assignable from this UI — fall back to BUSINESS_OWNER as the
  // controlled value but keep the option list intact.
  const initial: AssignableRole = isAssignable(currentRole)
    ? currentRole
    : "BUSINESS_OWNER";
  const [value, setValue] = useState<AssignableRole>(initial);
  const [error, setError] = useState<string | null>(null);

  function onChange(next: AssignableRole) {
    if (next === value) return;
    setError(null);
    const previous = value;
    setValue(next);
    start(async () => {
      const res = await adminChangeUserRoleAction({ userId, newRole: next });
      if (!res.ok) {
        setError(res.error);
        setValue(previous);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AssignableRole)}
        disabled={pending || disabled}
        className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm font-semibold disabled:opacity-50"
        title={disabled ? disabledReason : undefined}
      >
        {ASSIGNABLE.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      {pending && <p className="text-xs text-muted-foreground">جارٍ الحفظ…</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {disabled && disabledReason && !error && (
        <p className="text-xs text-muted-foreground">{disabledReason}</p>
      )}
    </div>
  );
}
