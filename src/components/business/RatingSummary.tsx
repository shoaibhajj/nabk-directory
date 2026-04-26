import { Star } from "lucide-react";

export function RatingSummary({
  average,
  count,
  buckets,
}: {
  average: number;
  count: number;
  buckets: Record<1 | 2 | 3 | 4 | 5, number>;
}) {
  if (count === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        لا توجد تقييمات بعد. كن أول من يقيّم هذا العمل.
      </p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
      <div className="text-center">
        <div className="text-5xl font-extrabold text-foreground">
          {average.toFixed(1)}
        </div>
        <div className="mt-1 inline-flex items-center gap-1 text-[var(--color-star)]">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={
                n <= Math.round(average)
                  ? "h-4 w-4 fill-[var(--color-star)]"
                  : "h-4 w-4 text-muted-foreground"
              }
            />
          ))}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {count.toLocaleString("ar-EG")} تقييم
        </div>
      </div>

      <ul className="space-y-1.5">
        {([5, 4, 3, 2, 1] as const).map((s) => {
          const c = buckets[s];
          const pct = count > 0 ? Math.round((c / count) * 100) : 0;
          return (
            <li key={s} className="flex items-center gap-3 text-xs">
              <span className="w-6 shrink-0 text-muted-foreground">{s}★</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-[var(--color-star)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-left text-muted-foreground" dir="ltr">
                {c}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
