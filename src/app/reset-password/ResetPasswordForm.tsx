"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, {
    ok: false,
    error: undefined,
  });

  if (state?.ok) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-accent">تم تحديث كلمة المرور بنجاح.</p>
        <Link
          href="/sign-in"
          className="inline-block rounded-full bg-primary px-6 py-2 font-bold text-white"
        >
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">كلمة المرور الجديدة</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
        />
        <p className="text-xs text-muted-foreground">8 أحرف على الأقل</p>
      </div>

      {state?.error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <Button type="submit" variant="primary" size="md" disabled={pending}>
        {pending ? "جاري الحفظ..." : "تحديث كلمة المرور"}
      </Button>
    </form>
  );
}
