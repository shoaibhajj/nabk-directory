"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

interface Props {
  /** Direct Cloudinary URL (must have .pdf extension) */
  fileUrl: string;
  filename?: string;
  fullWidth?: boolean;
}

export function PublicDownloadButton({
  fileUrl,
  filename = "daleel-nabk.pdf",
  fullWidth = false,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open directly if fetch fails
      window.open(fileUrl, "_blank");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className={`flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 active:scale-95 transition-transform disabled:opacity-70 disabled:cursor-not-allowed ${
        fullWidth ? "w-full" : "flex-1"
      }`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {loading ? "جاري التحميل..." : "تحميل PDF"}
    </button>
  );
}
