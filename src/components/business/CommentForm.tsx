"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { postCommentAction } from "@/features/comments/actions";

const MAX = 500;

export function CommentForm({
  businessId,
  parentId,
  placeholder = "اكتب تعليقك هنا... (الحد الأقصى 500 حرف)",
  onCancel,
  autoFocus,
}: {
  businessId: string;
  parentId?: string;
  placeholder?: string;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const remaining = MAX - content.length;
  const tooLong = remaining < 0;
  const empty = content.trim().length === 0;

  function submit() {
    if (empty || tooLong || pending) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await postCommentAction({
        businessId,
        content: content.trim(),
        parentId,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setContent("");
      setSuccess(
        parentId
          ? "تم نشر ردّك."
          : "تم استلام تعليقك. قد يحتاج إلى مراجعة قبل الظهور للجميع.",
      );
      router.refresh();
      if (onCancel) onCancel();
    });
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={parentId ? 2 : 3}
        disabled={pending}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={submit}
            disabled={pending || empty || tooLong}
          >
            {pending ? "جاري النشر..." : parentId ? "نشر الرد" : "نشر التعليق"}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={pending}
            >
              إلغاء
            </Button>
          )}
        </div>
        <span
          className={
            tooLong
              ? "text-xs font-bold text-destructive"
              : "text-xs text-muted-foreground"
          }
        >
          {remaining} حرف متبقي
        </span>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-accent">{success}</p>}
    </div>
  );
}
