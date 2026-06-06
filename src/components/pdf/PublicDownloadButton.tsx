"use client";

import { FileDown } from "lucide-react";

interface Props {
  fileUrl: string;
  filename?: string;
  fullWidth?: boolean;
}

/**
 * PublicDownloadButton — for public users.
 * Uses the pre-generated outputFileUrl directly (no auth required).
 */
export function PublicDownloadButton({
  fileUrl,
  filename = "dalil-alnabk.pdf",
  fullWidth = false,
}: Props) {
  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      download={filename}
      className={`flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 ${
        fullWidth ? "w-full" : ""
      }`}
    >
      <FileDown className="h-4 w-4" />
      تحميل PDF
    </a>
  );
}
