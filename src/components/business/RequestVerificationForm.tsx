"use client";

import { useState, useTransition } from "react";
import { requestVerification } from "@/features/businesses/verification-actions";
import { VerificationStatus } from "@prisma/client";
import { VerificationStatusBadge } from "./VerificationStatusBadge";

interface Props {
  businessProfileId: string;
  currentStatus: VerificationStatus;
  lastRequest?: {
    status: VerificationStatus;
    adminNote?: string | null;
    createdAt: Date;
  } | null;
}

export function RequestVerificationForm({
  businessProfileId,
  currentStatus,
  lastRequest,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [idImageUrl, setIdImageUrl] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // إذا كان موثّقاً — اعرض شارة فقط
  if (currentStatus === VerificationStatus.VERIFIED) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-2">
          <VerificationStatusBadge status={VerificationStatus.VERIFIED} />
          <span className="text-sm text-green-700">نشاطك موثّق بشكل رسمي</span>
        </div>
      </div>
    );
  }

  // إذا كان معلّقاً — اعرض رسالة انتظار
  if (currentStatus === VerificationStatus.PENDING) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <div className="flex items-center gap-2">
          <VerificationStatusBadge status={VerificationStatus.PENDING} />
          <span className="text-sm text-yellow-700">
            طلبك قيد المراجعة من قِبل الإدارة
          </span>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await requestVerification(businessProfileId, {
        idImageUrl: idImageUrl.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
      });
      if (result.success) {
        setMessage({ type: "success", text: "تم إرسال طلب التوثيق بنجاح" });
      } else {
        setMessage({ type: "error", text: result.error });
      }
    });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">توثيق النشاط</h3>
        <VerificationStatusBadge status={currentStatus} />
      </div>

      {/* سبب الرفض السابق */}
      {currentStatus === VerificationStatus.REJECTED && lastRequest?.adminNote && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <span className="font-medium">سبب الرفض السابق: </span>
          {lastRequest.adminNote}
        </div>
      )}

      <p className="mb-4 text-sm text-gray-500">
        أرسل طلب توثيق للإدارة. الحقول أدناه اختيارية لكنها تُسرّع المراجعة.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label
            htmlFor="idImageUrl"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            رابط صورة الهوية / جواز السفر{" "}
            <span className="text-gray-400">(اختياري)</span>
          </label>
          <input
            id="idImageUrl"
            type="url"
            placeholder="https://..."
            value={idImageUrl}
            onChange={(e) => setIdImageUrl(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            dir="ltr"
          />
        </div>

        <div>
          <label
            htmlFor="contactPhone"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            رقم التواصل{" "}
            <span className="text-gray-400">(اختياري)</span>
          </label>
          <input
            id="contactPhone"
            type="tel"
            placeholder="09xxxxxxxx"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            dir="ltr"
          />
        </div>

        {message && (
          <p
            className={`text-sm ${
              message.type === "success" ? "text-green-600" : "text-red-600"
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "جارٍ الإرسال..." : "إرسال طلب التوثيق"}
        </button>
      </form>
    </div>
  );
}
