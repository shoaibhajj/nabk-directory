"use client";

import { useActionState } from "react";
import { signInAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignInForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, formAction, pending] = useActionState(signInAction, { error: undefined });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">كلمة المرور</Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>

      {state?.error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <Button type="submit" variant="primary" size="md" disabled={pending}>
        {pending ? "جاري الدخول..." : "تسجيل الدخول"}
      </Button>

      {googleEnabled && (
        <a href="/api/auth/signin/google" className="block">
          <Button type="button" variant="outline" size="md" className="w-full">
            تسجيل الدخول بحساب Google
          </Button>
        </a>
      )}
    </form>
  );
}
