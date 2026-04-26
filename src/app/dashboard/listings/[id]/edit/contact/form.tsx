"use client";

import { useActionState, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import type { ActionResult } from "@/features/businesses/mutations";

const PHONE_LABELS = [
  { value: "MOBILE", label: "جوال" },
  { value: "LANDLINE", label: "أرضي" },
  { value: "WHATSAPP", label: "واتساب" },
  { value: "FAX", label: "فاكس" },
];
const SOCIAL_PLATFORMS = [
  { value: "FACEBOOK", label: "فيسبوك" },
  { value: "INSTAGRAM", label: "إنستغرام" },
  { value: "TWITTER", label: "تويتر / X" },
  { value: "TIKTOK", label: "تيك توك" },
  { value: "WHATSAPP", label: "واتساب" },
  { value: "TELEGRAM", label: "تلغرام" },
  { value: "WEBSITE", label: "موقع إلكتروني" },
];

interface PhoneRow {
  label: string;
  number: string;
}
interface SocialRow {
  platform: string;
  url: string;
}

interface ContactFormProps {
  id: string;
  action: (
    prev: ActionResult | undefined,
    formData: FormData,
  ) => Promise<ActionResult>;
  initialPhones: PhoneRow[];
  initialSocials: SocialRow[];
}

export function ContactForm({
  id,
  action,
  initialPhones,
  initialSocials,
}: ContactFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const error = state && !state.ok ? state.error : null;
  const saved = state && state.ok;
  const [phones, setPhones] = useState<PhoneRow[]>(
    initialPhones.length > 0 ? initialPhones : [{ label: "MOBILE", number: "" }],
  );
  const [socials, setSocials] = useState<SocialRow[]>(initialSocials);

  return (
    <form action={formAction} noValidate>
      <Card>
        <CardContent className="space-y-6 p-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">أرقام التواصل</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPhones([...phones, { label: "MOBILE", number: "" }])}
              >
                <Plus className="h-4 w-4" /> إضافة رقم
              </Button>
            </div>
            <input type="hidden" name="phoneCount" value={phones.length} />
            {phones.map((p, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-[140px_1fr_auto]">
                <select
                  name={`phone-${i}-label`}
                  value={p.label}
                  onChange={(e) => {
                    const next = [...phones];
                    next[i] = { ...next[i], label: e.target.value };
                    setPhones(next);
                  }}
                  className="h-12 rounded-full bg-input px-4 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                >
                  {PHONE_LABELS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
                <Input
                  name={`phone-${i}-number`}
                  value={p.number}
                  dir="ltr"
                  placeholder="+963944123456"
                  onChange={(e) => {
                    const next = [...phones];
                    next[i] = { ...next[i], number: e.target.value };
                    setPhones(next);
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="حذف"
                  onClick={() => setPhones(phones.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ))}
            {phones.length === 0 && (
              <p className="text-sm text-muted-foreground">
                لا توجد أرقام — اضغط «إضافة رقم» لإضافة وسيلة تواصل.
              </p>
            )}
          </section>

          <hr className="border-border" />

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">حسابات التواصل الاجتماعي (اختياري)</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setSocials([...socials, { platform: "FACEBOOK", url: "" }])
                }
              >
                <Plus className="h-4 w-4" /> إضافة حساب
              </Button>
            </div>
            <input type="hidden" name="socialCount" value={socials.length} />
            {socials.map((s, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-[160px_1fr_auto]">
                <select
                  name={`social-${i}-platform`}
                  value={s.platform}
                  onChange={(e) => {
                    const next = [...socials];
                    next[i] = { ...next[i], platform: e.target.value };
                    setSocials(next);
                  }}
                  className="h-12 rounded-full bg-input px-4 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                >
                  {SOCIAL_PLATFORMS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <Input
                  name={`social-${i}-url`}
                  value={s.url}
                  dir="ltr"
                  placeholder="https://..."
                  onChange={(e) => {
                    const next = [...socials];
                    next[i] = { ...next[i], url: e.target.value };
                    setSocials(next);
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="حذف"
                  onClick={() => setSocials(socials.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ))}
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-emerald-700">تم الحفظ ✓</p>}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="submit" variant="outline" size="md" disabled={pending}>
              حفظ
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={pending}
              name="_next"
              value={`/dashboard/listings/${id}/edit/hours`}
            >
              حفظ ومتابعة →
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
