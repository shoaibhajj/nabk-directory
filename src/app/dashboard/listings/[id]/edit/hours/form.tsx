"use client";

import { useActionState, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/features/businesses/mutations";
import { DAY_NAMES_AR } from "@/lib/working-hours";

interface DayRow {
  dayOfWeek: number;
  isOpen: boolean;
  is24Hours: boolean;
  openTime: string;
  closeTime: string;
}

interface HoursFormProps {
  id: string;
  action: (
    prev: ActionResult | undefined,
    formData: FormData,
  ) => Promise<ActionResult>;
  initial: DayRow[];
}

export function HoursForm({ id, action, initial }: HoursFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const error = state && !state.ok ? state.error : null;
  const saved = state && state.ok;
  const [rows, setRows] = useState<DayRow[]>(initial);

  function update(dayOfWeek: number, patch: Partial<DayRow>) {
    setRows(rows.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...patch } : r)));
  }

  return (
    <form action={formAction} noValidate>
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.dayOfWeek}
                className="grid items-center gap-3 rounded-2xl border border-border bg-background p-3 md:grid-cols-[120px_1fr_1fr_auto]"
              >
                <div className="font-semibold">{DAY_NAMES_AR[row.dayOfWeek]}</div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name={`day-${row.dayOfWeek}-open`}
                    checked={row.isOpen}
                    onChange={(e) =>
                      update(row.dayOfWeek, { isOpen: e.target.checked })
                    }
                    className="h-4 w-4 accent-[var(--color-accent)]"
                  />
                  مفتوح
                </label>
                {row.isOpen ? (
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name={`day-${row.dayOfWeek}-24`}
                        checked={row.is24Hours}
                        onChange={(e) =>
                          update(row.dayOfWeek, { is24Hours: e.target.checked })
                        }
                        className="h-4 w-4 accent-[var(--color-accent)]"
                      />
                      24 ساعة
                    </label>
                    {!row.is24Hours && (
                      <>
                        <input
                          type="time"
                          name={`day-${row.dayOfWeek}-openTime`}
                          value={row.openTime}
                          onChange={(e) =>
                            update(row.dayOfWeek, { openTime: e.target.value })
                          }
                          className="h-10 rounded-full bg-input px-4 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                        />
                        <span className="text-muted-foreground">—</span>
                        <input
                          type="time"
                          name={`day-${row.dayOfWeek}-closeTime`}
                          value={row.closeTime}
                          onChange={(e) =>
                            update(row.dayOfWeek, { closeTime: e.target.value })
                          }
                          className="h-10 rounded-full bg-input px-4 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                        />
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">مغلق</div>
                )}
                <div />
              </div>
            ))}
          </div>

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
              value={`/dashboard/listings/${id}/edit/photos`}
            >
              حفظ ومتابعة →
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
