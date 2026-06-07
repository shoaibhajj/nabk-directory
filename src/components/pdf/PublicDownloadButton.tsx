"use client";

import { Download } from "lucide-react";

interface Props {
  /** Edition ID — download proxied through /api/pdf/download/[editionId] */
  editionId: string;
  filename?: string;
  fullWidth?: boolean;
}

export function PublicDownloadButton({
  editionId,
  filename = "daleel-nabk.pdf",
  fullWidth = false,
}: Props) {
  return (
    <a
      href={`/api/pdf/download/${editionId}`}
      download={filename}
      className={`flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 active:scale-95 transition-transform ${
        fullWidth ? "w-full" : "flex-1"
      }`}
    >
      <Download className="h-4 w-4" />
      تحميل PDF
    </a>
  );
}
