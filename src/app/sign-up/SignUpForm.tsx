"use client";

import { useActionState } from "react";
import { signUpAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUpAction, { error: undefined });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">الاسم الكامل</Label>
        <Input id="name" name="name" required autoComplete="name" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">كلمة المرور</Label>
        <Input id="password" name="password" type="password" required autoComplete="new-password" minLength={8} />
        <p className="text-xs text-muted-foreground">8 أحرف على الأقل</p>
      </div>

      {state?.error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <Button type="submit" variant="primary" size="md" disabled={pending}>
        {pending ? "جاري الإنشاء..." : "إنشاء الحساب"}
      </Button>
    </form>
  );
}
