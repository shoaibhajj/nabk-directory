"use client";

import { useActionState } from "react";
import { forgotPasswordAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, {
    sent: false,
    error: undefined,
  });

  if (state?.sent) {
    return (
      <div className="rounded-2xl bg-accent/10 px-4 py-4 text-center text-sm text-accent">
        إذا كان البريد مسجّلاً لدينا، فسنرسل لك رابطاً لإعادة تعيين كلمة المرور خلال دقائق.
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>

      {state?.error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <Button type="submit" variant="primary" size="md" disabled={pending}>
        {pending ? "جاري الإرسال..." : "إرسال الرابط"}
      </Button>
    </form>
  );
}
