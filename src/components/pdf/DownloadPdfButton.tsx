"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";

interface Props {
  editionId: string;
  fullWidth?: boolean;
}

/**
 * Client Component: triggers PDF download for public users.
 * Calls POST /api/pdf/generate — auth check happens server-side.
 * If user is not an admin, the API returns 401 and we show a message.
 *
 * Note: Public users cannot generate PDFs — this button is intentionally
 * for admin preview. For public download, use a direct fileUrl link.
 * This component is reused in the admin preview page.
 */
export function DownloadPdfButton({ editionId, fullWidth = false }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editionId, isPreview: false }),
      });

      if (res.status === 401) {
        setError("هذا الزر للمسؤولين فقط");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "حدث خطأ");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `edition-${editionId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={fullWidth ? "w-full" : ""}>
      <button
        onClick={handleDownload}
        disabled={loading}
        className={`flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60 ${
          fullWidth ? "w-full" : ""
        }`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="h-4 w-4" />
        )}
        {loading ? "جاري التوليد…" : "تحميل PDF"}
      </button>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
