"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  submitContactMessageAction,
  type ContactState,
} from "@/features/support/actions";

const initial: ContactState = {};

export function ContactForm() {
  const [state, action, pending] = useActionState(
    submitContactMessageAction,
    initial,
  );

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold text-primary">تم استلام رسالتك</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          شكراً لتواصلك معنا. سنعود إليك قريباً عبر بريدك الإلكتروني.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <h2 className="text-lg font-bold">أرسل رسالة</h2>

      {/* Honeypot field — hidden from real users with both CSS and aria, but
          bots typically fill every input they see. The server quietly drops
          submissions where this is non-empty. */}
      <div aria-hidden="true" className="hidden">
        <label>
          لا تملأ هذا الحقل
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          name="name"
          label="الاسم"
          required
          maxLength={80}
          error={state.fieldErrors?.name}
          autoComplete="name"
        />
        <Field
          name="email"
          label="البريد الإلكتروني"
          type="email"
          required
          maxLength={120}
          dir="ltr"
          error={state.fieldErrors?.email}
          autoComplete="email"
        />
      </div>
      <Field
        name="subject"
        label="الموضوع (اختياري)"
        maxLength={160}
        error={state.fieldErrors?.subject}
      />
      <div>
        <label
          htmlFor="contact-message"
          className="mb-1 block text-sm font-semibold"
        >
          رسالتك <span className="text-destructive">*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={6}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        {state.fieldErrors?.message && (
          <p className="mt-1 text-xs text-destructive">
            {state.fieldErrors.message}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          الحد الأقصى 2000 حرف.
        </p>
      </div>

      {state.error && !state.fieldErrors && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          باستخدام النموذج فإنك توافق على معالجة بياناتك للرد على استفسارك.
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? "جارٍ الإرسال…" : "إرسال"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  maxLength,
  dir,
  error,
  autoComplete,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  dir?: "ltr" | "rtl";
  error?: string;
  autoComplete?: string;
}) {
  const id = `contact-${name}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        dir={dir}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
