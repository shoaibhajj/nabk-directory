"use client";

import { FileDown } from "lucide-react";

interface Props {
  fileUrl: string;
  filename?: string;
}

/**
 * Simple download button for published PDF editions.
 * Uses a plain <a> tag — no auth required.
 * Only rendered when the edition is PUBLISHED and the job SUCCEEDED,
 * so outputFileUrl is guaranteed to exist.
 */
export function PublicDownloadButton({ fileUrl, filename = "دليل-النبك.pdf" }: Props) {
  return (
    <a
      href={fileUrl}
      download={filename}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-white hover:bg-accent/90 transition-colors"
    >
      <FileDown className="h-3.5 w-3.5" />
      تحميل PDF
    </a>
  );
}
