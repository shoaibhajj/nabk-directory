import Link from "next/link";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type WizardStepKey = "basics" | "category" | "contact" | "hours" | "photos";

export const WIZARD_STEPS: { key: WizardStepKey; label: string }[] = [
  { key: "basics", label: "الأساسيات" },
  { key: "category", label: "التصنيف والموقع" },
  { key: "contact", label: "التواصل" },
  { key: "hours", label: "ساعات العمل" },
  { key: "photos", label: "الصور" },
];

export interface WizardStepperProps {
  listingId: string;
  current: WizardStepKey;
  completed: Record<WizardStepKey, boolean>;
}

export function WizardStepper({ listingId, current, completed }: WizardStepperProps) {
  return (
    <ol className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-card">
      {WIZARD_STEPS.map((step, idx) => {
        const isCurrent = step.key === current;
        const isDone = completed[step.key];
        return (
          <li key={step.key} className="flex items-center gap-2">
            <Link
              href={`/dashboard/listings/${listingId}/edit/${step.key}`}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                isCurrent
                  ? "bg-accent text-accent-foreground shadow-card"
                  : isDone
                    ? "bg-secondary text-secondary-foreground hover:bg-[#D9F0DC]"
                    : "bg-muted text-muted-foreground hover:bg-secondary",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isCurrent
                    ? "bg-white/20 text-white"
                    : isDone
                      ? "bg-accent text-accent-foreground"
                      : "bg-card text-muted-foreground",
                )}
              >
                {isDone && !isCurrent ? <Check className="h-3.5 w-3.5" /> : idx + 1}
              </span>
              {step.label}
            </Link>
            {idx < WIZARD_STEPS.length - 1 && (
              <span className="hidden h-px w-4 bg-border md:block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
