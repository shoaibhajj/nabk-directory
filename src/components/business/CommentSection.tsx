import Link from "next/link";
import { CommentForm } from "@/components/business/CommentForm";
import { CommentItem } from "@/components/business/CommentItem";
import type { CommentsPage } from "@/features/comments/queries";

export function CommentSection({
  businessId,
  page,
  viewerId,
  isAdmin,
  signInHref,
}: {
  businessId: string;
  page: CommentsPage;
  viewerId: string | null;
  isAdmin: boolean;
  signInHref: string;
}) {
  return (
    <div className="space-y-5">
      {viewerId ? (
        <CommentForm businessId={businessId} />
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          <Link href={signInHref} className="font-bold text-accent hover:underline">
            سجّل دخولك
          </Link>{" "}
          لتترك تعليقاً.
        </div>
      )}

      {page.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          لا توجد تعليقات بعد. كن أول من يعلّق.
        </p>
      ) : (
        <ul className="space-y-3">
          {page.items.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              businessId={businessId}
              viewerId={viewerId}
              isAdmin={isAdmin}
              replies={c.replies}
            />
          ))}
        </ul>
      )}

      {page.hasMore && (
        <div className="text-center">
          <Link
            href={`?commentsPage=${page.page + 1}#comments`}
            className="text-sm font-bold text-accent hover:underline"
          >
            عرض المزيد من التعليقات
          </Link>
        </div>
      )}
    </div>
  );
}
