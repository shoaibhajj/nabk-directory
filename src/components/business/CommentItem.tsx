"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CommentForm } from "@/components/business/CommentForm";
import {
  deleteOwnCommentAction,
  adminApproveCommentAction,
  adminHideCommentAction,
} from "@/features/comments/actions";

type UserSummary = { id: string; name: string; role: string; image: string | null };

type CommentNode = {
  id: string;
  content: string;
  status: string;
  createdAt: Date | string;
  parentId: string | null;
  user: UserSummary;
  hiddenReason?: string | null;
};

function initialOf(name: string) {
  return name.trim().charAt(0) || "؟";
}

function relTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return formatDistanceToNow(date, { addSuffix: true, locale: ar });
}

function RoleBadge({ role }: { role: string }) {
  if (role === "ADMIN" || role === "SUPER_ADMIN")
    return <Badge variant="accent">مشرف</Badge>;
  if (role === "BUSINESS_OWNER")
    return <Badge variant="default">صاحب عمل</Badge>;
  return null;
}

export function CommentItem({
  comment,
  businessId,
  viewerId,
  isAdmin,
  replies = [],
  isReply = false,
}: {
  comment: CommentNode;
  businessId: string;
  viewerId: string | null;
  isAdmin: boolean;
  replies?: CommentNode[];
  isReply?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [hideReason, setHideReason] = useState("");
  const [showHideForm, setShowHideForm] = useState(false);

  const isOwn = viewerId !== null && comment.user.id === viewerId;
  const isPending = comment.status === "PENDING_REVIEW";
  const isHidden = comment.status === "HIDDEN_BY_ADMIN";

  function deleteOwn() {
    if (!confirm("هل أنت متأكد من حذف هذا التعليق؟")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteOwnCommentAction(comment.id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function approve() {
    setError(null);
    startTransition(async () => {
      const res = await adminApproveCommentAction(comment.id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function hide() {
    if (!hideReason.trim()) {
      setError("يرجى إدخال سبب الإخفاء.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await adminHideCommentAction({
        commentId: comment.id,
        reason: hideReason.trim(),
      });
      if (!res.ok) setError(res.error);
      else {
        setShowHideForm(false);
        setHideReason("");
        router.refresh();
      }
    });
  }

  return (
    <li className={isReply ? "ms-12" : ""}>
      <div
        className={
          "rounded-2xl border p-4 " +
          (isPending
            ? "border-amber-300 bg-amber-50/50"
            : isHidden
              ? "border-border bg-muted/40"
              : "border-border bg-card")
        }
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
            {initialOf(comment.user.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold">{comment.user.name}</span>
              <RoleBadge role={comment.user.role} />
              {isPending && (
                <Badge variant="outline">قيد المراجعة</Badge>
              )}
              {isHidden && (
                <Badge variant="outline">مخفي بواسطة الإدارة</Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {relTime(comment.createdAt)}
              </span>
            </div>
            {isHidden ? (
              <p className="mt-2 text-sm italic text-muted-foreground">
                تم إخفاء هذا التعليق
                {comment.hiddenReason ? ` — ${comment.hiddenReason}` : "."}
              </p>
            ) : (
              <p className="mt-2 whitespace-pre-line text-sm">
                {comment.content}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {!isReply && !isHidden && !isPending && viewerId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReplyForm((v) => !v)}
                >
                  {showReplyForm ? "إلغاء" : "رد"}
                </Button>
              )}
              {isOwn && !isHidden && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={deleteOwn}
                  disabled={pending}
                >
                  حذف
                </Button>
              )}
              {isAdmin && isPending && (
                <Button
                  type="button"
                  variant="accent"
                  size="sm"
                  onClick={approve}
                  disabled={pending}
                >
                  موافقة
                </Button>
              )}
              {isAdmin && (comment.status === "VISIBLE" || isPending) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHideForm((v) => !v)}
                  disabled={pending}
                >
                  {showHideForm ? "إلغاء" : "إخفاء"}
                </Button>
              )}
            </div>

            {showHideForm && (
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  value={hideReason}
                  onChange={(e) => setHideReason(e.target.value)}
                  placeholder="سبب الإخفاء..."
                  className="w-full rounded-full bg-input px-4 py-2 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  maxLength={200}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={hide}
                  disabled={pending || !hideReason.trim()}
                >
                  تأكيد الإخفاء
                </Button>
              </div>
            )}

            {error && (
              <p className="mt-2 text-xs text-destructive">{error}</p>
            )}

            {showReplyForm && !isReply && (
              <div className="mt-3">
                <CommentForm
                  businessId={businessId}
                  parentId={comment.id}
                  placeholder="اكتب ردك..."
                  autoFocus
                  onCancel={() => setShowReplyForm(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {replies.length > 0 && (
        <ul className="mt-2 space-y-2">
          {replies.map((r) => (
            <CommentItem
              key={r.id}
              comment={r}
              businessId={businessId}
              viewerId={viewerId}
              isAdmin={isAdmin}
              isReply
            />
          ))}
        </ul>
      )}
    </li>
  );
}
