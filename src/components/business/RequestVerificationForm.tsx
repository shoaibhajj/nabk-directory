"use client";

import { useState, useTransition, useRef } from "react";
import Image from "next/image";
import {
  requestVerification,
  uploadVerificationImageAction,
} from "@/features/businesses/verification-actions";
import { VerificationStatus } from "@prisma/client";
import { VerificationStatusBadge } from "./VerificationStatusBadge";

interface Props {
  businessProfileId: string;
  currentStatus: VerificationStatus;
  lastRequest?: {
    status: VerificationStatus;
    adminNote?: string | null;
    idImageUrl?: string | null;
    createdAt: Date;
  } | null;
}

type ImageMode = "upload" | "url";

export function RequestVerificationForm({
  businessProfileId,
  currentStatus,
  lastRequest,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [imageMode, setImageMode] = useState<ImageMode>("upload");
  const [idImageUrl, setIdImageUrl] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<
    "idle" | "uploading" | "done" | "error"
  >("idle");
  const [uploadError, setUploadError] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── إذا كان موثّقاً ────────────────────────────────────────────────────────
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

  // ── إذا كان معلّقاً ────────────────────────────────────────────────────────
  if (currentStatus === VerificationStatus.PENDING) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <div className="flex items-center gap-2">
          <VerificationStatusBadge status={VerificationStatus.PENDING} />
          <span className="text-sm text-yellow-700">
            طلبك قيد المراجعة من قِبل الإدارة
          </span>
        </div>
        {lastRequest?.idImageUrl && (
          <div className="mt-3">
            <p className="mb-1 text-xs text-yellow-600">الصورة المرفقة:</p>
            <a
              href={lastRequest.idImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <Image
                src={lastRequest.idImageUrl}
                alt="صورة الهوية"
                width={120}
                height={80}
                className="rounded border border-yellow-200 object-cover"
              />
            </a>
          </div>
        )}
      </div>
    );
  }

  // ── رفع ملف → Cloudinary ──────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // client-side validations
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setUploadError("يُقبل jpg / png / webp فقط");
      setUploadState("error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("حجم الملف يتجاوز 5MB");
      setUploadState("error");
      return;
    }

    // preview local
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewSrc(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploadState("uploading");
    setUploadError("");
    setUploadedUrl("");

    const fd = new FormData();
    fd.append("file", file);

    const result = await uploadVerificationImageAction(businessProfileId, fd);
    if (result.success && result.data) {
      setUploadedUrl(result.data.url);
      setUploadState("done");
    } else {
      setUploadError(
        (result as { success: false; error: string }).error ?? "فشل الرفع"
      );
      setUploadState("error");
      setPreviewSrc(null);
    }
  };

  // ── إرسال الطلب ──────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const finalImageUrl =
      imageMode === "upload" ? uploadedUrl : idImageUrl.trim();

    startTransition(async () => {
      const result = await requestVerification(businessProfileId, {
        idImageUrl: finalImageUrl || undefined,
        contactPhone: contactPhone.trim() || undefined,
      });
      if (result.success) {
        setMessage({ type: "success", text: "تم إرسال طلب التوثيق بنجاح" });
      } else {
        setMessage({
          type: "error",
          text: (result as { success: false; error: string }).error,
        });
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

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ── صورة الهوية ── */}
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">
            صورة الهوية / جواز السفر{" "}
            <span className="text-gray-400">(اختياري)</span>
          </p>

          {/* Tab switcher */}
          <div className="mb-3 flex overflow-hidden rounded-md border border-gray-200">
            <button
              type="button"
              onClick={() => setImageMode("upload")}
              className={`flex-1 px-3 py-1.5 text-sm transition-colors ${
                imageMode === "upload"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              📁 رفع صورة
            </button>
            <button
              type="button"
              onClick={() => setImageMode("url")}
              className={`flex-1 px-3 py-1.5 text-sm transition-colors ${
                imageMode === "url"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              🔗 رابط مباشر
            </button>
          </div>

          {/* رفع صورة */}
          {imageMode === "upload" && (
            <div>
              <div
                onClick={() => fileRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center transition-colors hover:border-blue-400 hover:bg-blue-50"
              >
                {uploadState === "uploading" ? (
                  <>
                    <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                    <p className="text-sm text-blue-600">جارٍ الرفع…</p>
                  </>
                ) : previewSrc && uploadState === "done" ? (
                  <>
                    <Image
                      src={previewSrc}
                      alt="معاينة"
                      width={160}
                      height={100}
                      className="mb-2 rounded object-cover"
                    />
                    <p className="text-xs text-green-600">✅ تم الرفع بنجاح</p>
                    <p className="mt-1 text-xs text-gray-400">
                      اضغط لتغيير الصورة
                    </p>
                  </>
                ) : (
                  <>
                    <svg
                      className="mb-2 h-10 w-10 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-sm text-gray-600">
                      اضغط لاختيار صورة
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      JPG · PNG · WebP — حجم أقصى 5MB
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
              {uploadState === "error" && (
                <p className="mt-1 text-xs text-red-600">{uploadError}</p>
              )}
            </div>
          )}

          {/* رابط مباشر */}
          {imageMode === "url" && (
            <input
              type="url"
              placeholder="https://..."
              value={idImageUrl}
              onChange={(e) => setIdImageUrl(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              dir="ltr"
            />
          )}
        </div>

        {/* رقم التواصل */}
        <div>
          <label
            htmlFor="contactPhone"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            رقم التواصل <span className="text-gray-400">(اختياري)</span>
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
          disabled={isPending || uploadState === "uploading"}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "جارٍ الإرسال..." : "إرسال طلب التوثيق"}
        </button>
      </form>
    </div>
  );
}
