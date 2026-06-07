"use client";

import { Download } from "lucide-react";

interface Props {
  /** Direct Cloudinary URL (already has .pdf extension) */
  fileUrl: string;
  filename?: string;
  fullWidth?: boolean;
}

export function PublicDownloadButton({
  fileUrl,
  filename,
  fullWidth = false,
}: Props) {
  return (
    <a
      href={fileUrl}
      download={filename ?? true}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 active:scale-95 transition-transform ${
        fullWidth ? "w-full" : "flex-1"
      }`}
    >
      <Download className="h-4 w-4" />
      تحميل PDF
    </a>
  );
}
