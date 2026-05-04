"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PdfLegacyFile, PdfLegacyOpenMode, PdfLegacySourceType } from "@prisma/client";
import {
  upsertLegacyPdf,
  toggleLegacyPdfPublish,
  deleteLegacyPdf,
} from "@/app/actions/pdf-legacy";
import { toast } from "sonner";

// ─── helpers ─────────────────────────────────────────────────────────────────

const OPEN_MODE_LABELS: Record<PdfLegacyOpenMode, string> = {
  PREVIEW: "معاينة مدمجة",
  DIRECT_DOWNLOAD: "تنزيل مباشر",
  OPEN_IN_NEW_TAB: "فتح في تبويب جديد",
};

const SOURCE_TYPE_LABELS: Record<PdfLegacySourceType, string> = {
  FILE: "ملف مرفوع",
  EXTERNAL_URL: "رابط خارجي",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  initialRecords: PdfLegacyFile[];
}

const EMPTY_FORM = {
  id: undefined as string | undefined,
  titleAr: "",
  titleEn: "",
  descriptionAr: "",
  descriptionEn: "",
  sourceType: "EXTERNAL_URL" as PdfLegacySourceType,
  fileUrl: "",
  externalUrl: "",
  coverImageUrl: "",
  buttonLabelAr: "الدليل القديم",
  buttonLabelEn: "Old Directory",
  openMode: "OPEN_IN_NEW_TAB" as PdfLegacyOpenMode,
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function LegacyPdfManager({ initialRecords }: Props) {
  const router = useRouter();
  const [records, setRecords] = useState(initialRecords);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // ── Form helpers ────────────────────────────────────────────────────────────

  function openNew() {
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(r: PdfLegacyFile) {
    setForm({
      id: r.id,
      titleAr: r.titleAr,
      titleEn: r.titleEn ?? "",
      descriptionAr: r.descriptionAr ?? "",
      descriptionEn: r.descriptionEn ?? "",
      sourceType: r.sourceType,
      fileUrl: r.fileUrl ?? "",
      externalUrl: r.externalUrl ?? "",
      coverImageUrl: r.coverImageUrl ?? "",
      buttonLabelAr: r.buttonLabelAr,
      buttonLabelEn: r.buttonLabelEn ?? "",
      openMode: r.openMode,
    });
    setShowForm(true);
  }

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    try {
      await upsertLegacyPdf(form);
      toast.success(form.id ? "تم التحديث بنجاح" : "تم الإضافة بنجاح");
      setShowForm(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle publish ──────────────────────────────────────────────────────────

  async function handleToggle(id: string, publish: boolean) {
    setToggling(id);
    try {
      await toggleLegacyPdfPublish(id, publish);
      toast.success(publish ? "تم النشر" : "تم إيقاف النشر");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setToggling(null);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    setDeleting(id);
    try {
      await deleteLegacyPdf(id);
      toast.success("تم الحذف");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setDeleting(null);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {records.length === 0
            ? "لا توجد سجلات بعد"
            : `${records.length} سجل`}
        </p>
        <button
          onClick={openNew}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          + إضافة دليل قديم
        </button>
      </div>

      {/* Records list */}
      {records.length > 0 && (
        <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-900">
          {records.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              {/* Info */}
              <div className="flex items-start gap-4">
                {r.coverImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.coverImageUrl}
                    alt={r.titleAr}
                    className="h-16 w-12 rounded object-cover"
                  />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {r.titleAr}
                    </p>
                    {r.isPublished && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        منشور
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {SOURCE_TYPE_LABELS[r.sourceType]} ·{" "}
                    {OPEN_MODE_LABELS[r.openMode]}
                  </p>
                  {r.externalUrl && (
                    <p className="mt-0.5 max-w-xs truncate text-xs text-blue-500">
                      {r.externalUrl}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => handleToggle(r.id, !r.isPublished)}
                  disabled={toggling === r.id}
                  className={
                    r.isPublished
                      ? "rounded-lg border border-orange-300 px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-400 dark:hover:bg-orange-900/20"
                      : "rounded-lg border border-green-300 px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/20"
                  }
                >
                  {toggling === r.id
                    ? "..."
                    : r.isPublished
                    ? "إيقاف النشر"
                    : "نشر"}
                </button>
                <button
                  onClick={() => openEdit(r)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  تعديل
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  disabled={r.isPublished || deleting === r.id}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  {deleting === r.id ? "..." : "حذف"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl dark:bg-gray-900"
            style={{ maxHeight: "90dvh" }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {form.id ? "تعديل الدليل القديم" : "إضافة دليل قديم"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Fields */}
            <div className="space-y-5 p-5">
              {/* Title Ar */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  العنوان بالعربية *
                </label>
                <input
                  value={form.titleAr}
                  onChange={(e) => set("titleAr", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  placeholder="دليل النبك 2022"
                />
              </div>

              {/* Title En */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  العنوان بالإنجليزية
                </label>
                <input
                  dir="ltr"
                  value={form.titleEn}
                  onChange={(e) => set("titleEn", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  placeholder="Nabk Directory 2022"
                />
              </div>

              {/* Description Ar */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  وصف مختصر بالعربية
                </label>
                <textarea
                  rows={3}
                  value={form.descriptionAr}
                  onChange={(e) => set("descriptionAr", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              {/* Source type toggle */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  مصدر الملف
                </label>
                <div className="flex gap-3">
                  {(["EXTERNAL_URL", "FILE"] as PdfLegacySourceType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set("sourceType", t)}
                      className={
                        form.sourceType === t
                          ? "flex-1 rounded-lg bg-teal-600 py-2 text-sm font-medium text-white"
                          : "flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400"
                      }
                    >
                      {SOURCE_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* URL field based on source type */}
              {form.sourceType === "EXTERNAL_URL" ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    الرابط الخارجي للملف *
                  </label>
                  <input
                    dir="ltr"
                    value={form.externalUrl}
                    onChange={(e) => set("externalUrl", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    placeholder="https://drive.google.com/..."
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    رابط الملف المرفوع (Cloudinary / Storage) *
                  </label>
                  <input
                    dir="ltr"
                    value={form.fileUrl}
                    onChange={(e) => set("fileUrl", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    placeholder="https://res.cloudinary.com/.../directory.pdf"
                  />
                </div>
              )}

              {/* Cover image */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  رابط صورة الغلاف (اختياري)
                </label>
                <input
                  dir="ltr"
                  value={form.coverImageUrl}
                  onChange={(e) => set("coverImageUrl", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  placeholder="https://res.cloudinary.com/.../cover.jpg"
                />
              </div>

              {/* Button label Ar */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  نص الزر بالعربية
                </label>
                <input
                  value={form.buttonLabelAr}
                  onChange={(e) => set("buttonLabelAr", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              {/* Open mode */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  طريقة الفتح عند الضغط على الزر
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(OPEN_MODE_LABELS) as PdfLegacyOpenMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => set("openMode", m)}
                      className={
                        form.openMode === m
                          ? "rounded-lg bg-teal-600 py-2 text-xs font-medium text-white"
                          : "rounded-lg border border-gray-300 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400"
                      }
                    >
                      {OPEN_MODE_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-700">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
