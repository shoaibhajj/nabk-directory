"use client";

import { Download } from "lucide-react";

interface Props {
  /** Edition ID — download goes through /api/pdf/download/[editionId] proxy */
  editionId: string;
  filename?: string;
  fullWidth?: boolean;
}

export function PublicDownloadButton({
  editionId,
  filename,
  fullWidth = false,
}: Props) {
  const proxyUrl = `/api/pdf/download/${editionId}`;

  return (
    <a
      href={proxyUrl}
      download={filename ?? true}
      className={`flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 active:scale-95 transition-transform ${
        fullWidth ? "w-full" : "flex-1"
      }`}
    >
      <Download className="h-4 w-4" />
      تحميل PDF
    </a>
  );
}
