"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { submitRatingAction } from "@/features/ratings/actions";

export function RatingStars({
  businessId,
  initialScore,
  signedIn,
  ownsBusiness,
  signInHref,
}: {
  businessId: string;
  initialScore: number | null;
  signedIn: boolean;
  ownsBusiness: boolean;
  signInHref: string;
}) {
  const router = useRouter();
  const [score, setScore] = useState<number>(initialScore ?? 0);
  const [hover, setHover] = useState<number>(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);

  const display = hover || score;
  const interactive = signedIn && !ownsBusiness;

  function rate(value: number) {
    if (!interactive) return;
    setError(null);
    setScore(value); // optimistic
    startTransition(async () => {
      const res = await submitRatingAction({ businessId, score: value });
      if (!res.ok) {
        setError(res.error);
        setScore(initialScore ?? 0);
      } else {
        setThanks(true);
        setTimeout(() => setThanks(false), 2200);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2">
      <div
        className="inline-flex items-center gap-1"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= display;
          const starEl = (
            <Star
              className={
                filled
                  ? "h-7 w-7 fill-[var(--color-star)] text-[var(--color-star)]"
                  : "h-7 w-7 text-muted-foreground"
              }
            />
          );
          // Anonymous: render plain anchor links so navigation works before
          // client hydration. Owners: render disabled buttons (cannot rate).
          // Signed-in non-owners: render interactive buttons.
          if (!signedIn) {
            return (
              <Link
                key={n}
                href={signInHref}
                aria-label={`${n} نجوم — سجّل دخولك للتقييم`}
                className="rounded-full p-1 transition-transform hover:scale-110"
              >
                {starEl}
              </Link>
            );
          }
          return (
            <button
              key={n}
              type="button"
              disabled={pending || !interactive}
              onMouseEnter={() => setHover(n)}
              onClick={() => rate(n)}
              aria-label={`${n} نجوم`}
              className="rounded-full p-1 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {starEl}
            </button>
          );
        })}
      </div>
      {ownsBusiness ? (
        <p className="text-xs text-muted-foreground">
          أنت مالك هذا العمل — لا يمكنك تقييم نفسك.
        </p>
      ) : !signedIn ? (
        <p className="text-xs text-muted-foreground">
          <Link href={signInHref} className="font-bold text-accent hover:underline">
            سجّل دخولك
          </Link>{" "}
          لتترك تقييماً.
        </p>
      ) : score > 0 ? (
        <p className="text-xs text-muted-foreground">
          تقييمك: {score} من 5{thanks ? " — شكراً لك!" : ""}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">انقر على نجمة لتقييم هذا العمل.</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
