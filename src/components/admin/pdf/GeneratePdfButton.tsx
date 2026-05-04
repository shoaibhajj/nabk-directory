"use client";

import { useState } from "react";

interface Props {
  editionId: string;
  isPreview: boolean;
}

/**
 * Client Component: hits POST /api/pdf/generate and triggers browser download.
 * Shows loading state while the server is generating the PDF.
 */
export function GeneratePdfButton({ editionId, isPreview }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editionId, isPreview }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "حدث خطأ غير متوقع");
        return;
      }

      // Trigger download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = isPreview
        ? `preview-${editionId}.pdf`
        : `edition-${editionId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            {"جاري التوليد…"}
          </>
        ) : isPreview ? (
          "👁️ توليد معاينة"
        ) : (
          "📄 توليد PDF نهائي"
        )}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
