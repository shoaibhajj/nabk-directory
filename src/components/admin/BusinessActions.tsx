"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  adminApproveBusinessAction,
  adminRejectBusinessAction,
  adminRestoreBusinessAction,
  adminUpdateVerificationAction,
  adminUploadVerificationImageAction,
} from "@/features/admin/businesses-actions";
import type { VerificationStatus } from "@prisma/client";

type Status = "DRAFT" | "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";

const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  UNVERIFIED: "غير موثّق",
  PENDING: "بانتظار مراجعة التوثيق",
  VERIFIED: "موثّق",
  REJECTED: "مرفوض التوثيق",
};

const VERIFICATION_BADGE: Record<
  VerificationStatus,
  "outline" | "accent" | "destructive" | "secondary"
> = {
  UNVERIFIED: "outline",
  PENDING: "secondary",
  VERIFIED: "accent",
  REJECTED: "destructive",
};

// ─── Verification Modal ──────────────────────────────────────────────────────
function VerificationModal({
  businessId,
  currentStatus,
  onClose,
  onDone,
}: {
  businessId: string;
  currentStatus: VerificationStatus;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, start] = useTransition();
  const [newStatus, setNewStatus] = useState<"VERIFIED" | "REJECTED" | "UNVERIFIED">(
    currentStatus === "VERIFIED" ? "UNVERIFIED" : "VERIFIED",
  );
  const [adminNote, setAdminNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadPending, startUpload] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setUploadedUrl(null);
    setError(null);
  }

  function uploadFile() {
    if (!file) return;
    setError(null);
    startUpload(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await adminUploadVerificationImageAction(fd);
      if (!res.ok) setError(res.error);
      else setUploadedUrl(res.url);
    });
  }

  function submit() {
    setError(null);
    start(async () => {
      const res = await adminUpdateVerificationAction({
        businessId,
        newStatus,
        adminNote: adminNote.trim() || undefined,
      });
      if (!res.ok) setError(res.error);
      else {
        onDone();
        onClose();
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold">تعديل حالة التوثيق</h2>

        {/* Status selector */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">الحالة الجديدة</label>
          <div className="flex gap-2 flex-wrap">
            {(["VERIFIED", "REJECTED", "UNVERIFIED"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setNewStatus(s)}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                  newStatus === s
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-accent"
                }`}
              >
                {VERIFICATION_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Admin note */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">
            ملاحظة الإدارة{" "}
            <span className="text-muted-foreground">(اختياري)</span>
          </label>
          <Textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="سبب القرار أو ملاحظة لصاحب العمل..."
            rows={3}
            maxLength={500}
          />
        </div>

        {/* Cloudinary image upload — optional supporting document */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">
            صورة مستند داعم{" "}
            <span className="text-muted-foreground">(اختياري — JPEG/PNG/WebP، حد 5 MB)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="flex-1 text-sm"
            />
            {file && !uploadedUrl ? (
              <Button
                size="sm"
                variant="outline"
                onClick={uploadFile}
                disabled={uploadPending}
              >
                {uploadPending ? "جارٍ الرفع..." : "رفع"}
              </Button>
            ) : null}
          </div>
          {uploadedUrl ? (
            <p className="mt-1 text-xs text-green-600 dark:text-green-400">
              ✓ تم الرفع بنجاح
            </p>
          ) : null}
        </div>

        {error ? (
          <p className="mb-3 text-sm text-destructive">{error}</p>
        ) : null}

        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={submit} disabled={pending}>
            {pending ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            إلغاء
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main BusinessActions ────────────────────────────────────────────────────
export function BusinessActions({
  businessId,
  status,
  verificationStatus = "UNVERIFIED",
}: {
  businessId: string;
  status: Status;
  verificationStatus?: VerificationStatus;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"reject" | "suspend" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showVerifModal, setShowVerifModal] = useState(false);

  function approve() {
    setError(null);
    start(async () => {
      const res = await adminApproveBusinessAction({ businessId });
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function restore() {
    setError(null);
    start(async () => {
      const res = await adminRestoreBusinessAction({ businessId });
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function submitReason() {
    if (reason.trim().length < 3) {
      setError("السبب يجب أن يكون 3 أحرف على الأقل.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await adminRejectBusinessAction({ businessId, reason });
      if (!res.ok) {
        setError(res.error);
      } else {
        setMode(null);
        setReason("");
        router.refresh();
      }
    });
  }

  if (mode) {
    return (
      <div className="space-y-2">
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            mode === "reject"
              ? "اكتب سبب الرفض (سيُرسل لصاحب العمل)..."
              : "اكتب سبب الإيقاف..."
          }
          rows={3}
          maxLength={500}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={submitReason}
            disabled={pending}
          >
            {pending ? "جارٍ الإرسال..." : "تأكيد"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMode(null);
              setReason("");
              setError(null);
            }}
            disabled={pending}
          >
            إلغاء
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {showVerifModal ? (
        <VerificationModal
          businessId={businessId}
          currentStatus={verificationStatus}
          onClose={() => setShowVerifModal(false)}
          onDone={() => router.refresh()}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {/* Business status actions */}
        {status === "DRAFT" ? (
          <>
            <Button variant="primary" size="sm" onClick={approve} disabled={pending}>
              {pending ? "..." : "اعتماد"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMode("reject")} disabled={pending}>
              رفض
            </Button>
          </>
        ) : null}
        {status === "ACTIVE" ? (
          <Button variant="outline" size="sm" onClick={() => setMode("suspend")} disabled={pending}>
            إيقاف
          </Button>
        ) : null}
        {status === "SUSPENDED" ? (
          <Button variant="primary" size="sm" onClick={restore} disabled={pending}>
            استعادة
          </Button>
        ) : null}

        {/* Divider */}
        <span className="h-4 w-px bg-border" aria-hidden />

        {/* Verification badge + action button */}
        <Badge variant={VERIFICATION_BADGE[verificationStatus]}>
          {VERIFICATION_LABELS[verificationStatus]}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowVerifModal(true)}
          disabled={pending}
        >
          تعديل التوثيق
        </Button>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </>
  );
}
