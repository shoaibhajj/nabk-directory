"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { submitForReviewAction } from "@/features/businesses/mutations";

export function SubmitButton({
  id,
  disabled,
}: {
  id: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="primary"
        size="lg"
        disabled={disabled || pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await submitForReviewAction(id);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            router.push("/dashboard");
            router.refresh();
          });
        }}
      >
        {pending ? "جارٍ الإرسال..." : "إرسال للمراجعة"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
