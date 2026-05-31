"use client";

import { useState, useTransition } from "react";
import { VerificationStatus } from "@prisma/client";

type VerificationRequest = {
  id: string;
  idImageUrl: string | null;
  contactPhone: string | null;
  createdAt: Date;
  business: {
    id: string;
    nameAr: string;
    slug: string;
    city: { nameAr: string };
    category: { nameAr: string };
  };
  requestedBy: { name: string; email: string };
};

interface Props {
  requests: VerificationRequest[];
  approveAction: (id: string, note?: string) => Promise<{ success: boolean; error?: string }>;
  rejectAction: (id: string, reason: string) => Promise<{ success: boolean; error?: string }>;
}

function RequestCard({
  request,
  approveAction,
  rejectAction,
}: {
  request: VerificationRequest;
  approveAction: Props["approveAction"];
  rejectAction: Props["rejectAction"];
}) {
  const [isPending, startTransition] = useTransition();
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (done) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-400">
        تمت المعالجة
      </div>
    );
  }

  const handleApprove = () => {
    startTransition(async () => {
      const res = await approveAction(request.id);
      if (res.success) setDone(true);
      else setError(res.error ?? "خطأ غير معروف");
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      setError("يجب كتابة سبب الرفض");
      return;
    }
    startTransition(async () => {
      const res = await rejectAction(request.id, rejectReason);
      if (res.success) setDone(true);
      else setError(res.error ?? "خطأ غير معروف");
    });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      {/* رأس البطاقة */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{request.business.nameAr}</h3>
          <p className="text-xs text-gray-500">
            {request.business.category.nameAr} · {request.business.city.nameAr}
          </p>
        </div>
        <span className="text-xs text-gray-400">
          {new Date(request.createdAt).toLocaleDateString("ar-SY")}
        </span>
      </div>

      {/* بيانات الطلب */}
      <dl className="mb-4 space-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="w-28 text-gray-500 shrink-0">صاحب النشاط:</dt>
          <dd className="text-gray-700">
            {request.requestedBy.name} ({request.requestedBy.email})
          </dd>
        </div>
        {request.contactPhone && (
          <div className="flex gap-2">
            <dt className="w-28 text-gray-500 shrink-0">رقم التواصل:</dt>
            <dd className="text-gray-700 dir-ltr">{request.contactPhone}</dd>
          </div>
        )}
        {request.idImageUrl && (
          <div className="flex gap-2">
            <dt className="w-28 text-gray-500 shrink-0">صورة الهوية:</dt>
            <dd>
              <a
                href={request.idImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline text-xs"
              >
                عرض الصورة
              </a>
            </dd>
          </div>
        )}
      </dl>

      {/* خطأ */}
      {error && (
        <p className="mb-3 text-sm text-red-600">{error}</p>
      )}

      {/* أزرار الإجراء */}
      {!showRejectForm ? (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="flex-1 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isPending ? "..." : "قبول ✓"}
          </button>
          <button
            onClick={() => { setShowRejectForm(true); setError(""); }}
            disabled={isPending}
            className="flex-1 rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            رفض
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            placeholder="سبب الرفض (مطلوب)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
          />
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={isPending}
              className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? "..." : "تأكيد الرفض"}
            </button>
            <button
              onClick={() => { setShowRejectForm(false); setError(""); }}
              disabled={isPending}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminVerificationsClient({ requests, approveAction, rejectAction }: Props) {
  return (
    <div className="space-y-4">
      {requests.map((req) => (
        <RequestCard
          key={req.id}
          request={req}
          approveAction={approveAction}
          rejectAction={rejectAction}
        />
      ))}
    </div>
  );
}
