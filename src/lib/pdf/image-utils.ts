/**
 * image-utils.ts
 *
 * Sharp-based image fetch + resize utility for PDF generation.
 *
 * Strategy:
 *  - Always preserves the full image (no cropping).
 *  - Uses `contain` + white background when aspect ratios differ.
 *  - Uses `lanczos3` kernel — best quality for downscaling.
 *  - Auto-detects alpha → PNG; otherwise → JPEG with mozjpeg compression.
 *  - Returns a base64 data-URI so @react-pdf/renderer can embed it directly
 *    without any filesystem I/O.
 */

import sharp from "sharp";

export interface ResizeOptions {
  /** Fill colour when image doesn't fill the target box (default: white). */
  background?: { r: number; g: number; b: number; alpha: number };
  /** Force output format (default: auto-detect from alpha channel). */
  format?: "jpeg" | "png" | "webp";
  /** JPEG / WebP quality 1-100 (default: 82 — good balance size/quality). */
  quality?: number;
  /** Never upscale beyond the original resolution (default: true). */
  noUpscale?: boolean;
}

/**
 * Fetches any image URL, resizes it to the requested dimensions while
 * preserving the original aspect ratio, and returns a base64 data-URI
 * ready to pass straight to @react-pdf/renderer <Image src={...} />.
 *
 * Returns `null` on any network or processing error so callers can
 * fall back to a text-only placeholder without crashing.
 */
export async function fetchAndResizeImage(
  url: string,
  targetWidth: number,
  targetHeight: number,
  options: ResizeOptions = {}
): Promise<string | null> {
  if (!url?.trim()) return null;

  // ── 1. Fetch ────────────────────────────────────────────────────────────
  let inputBuffer: Buffer;
  try {
    const res = await fetch(url, {
      headers: {
        // Some CDNs block requests without a browser User-Agent.
        "User-Agent":
          "Mozilla/5.0 (compatible; NabkDirectory/1.0; +https://nabk-directory.com)",
        Accept: "image/*,*/*;q=0.8",
      },
      // Abort after 10 s to avoid hanging the PDF worker.
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.warn(
        `[image-utils] HTTP ${res.status} for ${url} — skipping image`
      );
      return null;
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      console.warn(
        `[image-utils] Non-image content-type "${contentType}" for ${url}`
      );
      return null;
    }

    inputBuffer = Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.error(`[image-utils] fetch failed for ${url}:`, err);
    return null;
  }

  // ── 2. Read metadata ────────────────────────────────────────────────────
  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(inputBuffer).metadata();
  } catch (err) {
    console.error(`[image-utils] metadata read failed for ${url}:`, err);
    return null;
  }

  const origW = metadata.width ?? targetWidth;
  const origH = metadata.height ?? targetHeight;
  const hasAlpha = metadata.hasAlpha ?? false;

  // ── 3. Decide effective dimensions ──────────────────────────────────────
  //
  // noUpscale (default true): if the original image is smaller than the
  // requested size in BOTH dimensions, keep the original size to avoid
  // blurry upscaling. We only resize if the image is larger.
  const noUpscale = options.noUpscale !== false;
  let effectiveW = targetWidth;
  let effectiveH = targetHeight;

  if (noUpscale && origW <= targetWidth && origH <= targetHeight) {
    effectiveW = origW;
    effectiveH = origH;
  }

  // ── 4. Choose fit strategy ───────────────────────────────────────────────
  //
  // If the aspect ratio is virtually identical (< 2 % diff) we use `fill`
  // (simple scale, no letterbox). Otherwise we use `contain` so the full
  // image is always visible with a neutral background filling the gaps.
  const origRatio = origW / origH;
  const targetRatio = effectiveW / effectiveH;
  const ratioDiff = Math.abs(origRatio - targetRatio) / targetRatio;

  const fit: keyof sharp.FitEnum =
    ratioDiff < 0.02 ? "fill" : "contain";

  const background = options.background ?? { r: 255, g: 255, b: 255, alpha: 1 };

  // ── 5. Build Sharp pipeline ──────────────────────────────────────────────
  let pipeline = sharp(inputBuffer)
    .resize(effectiveW, effectiveH, {
      fit,
      kernel: sharp.kernel.lanczos3, // best downscale quality
      background,
      withoutEnlargement: noUpscale,
    });

  // ── 6. Choose output format ──────────────────────────────────────────────
  //
  // Rule:
  //  • explicit `format` option wins.
  //  • images with an alpha channel → PNG (transparency preserved).
  //  • everything else → JPEG (smaller file, good for print PDFs).
  const fmt = options.format ?? (hasAlpha ? "png" : "jpeg");
  let mimeType: string;

  if (fmt === "png") {
    pipeline = pipeline.png({
      compressionLevel: 8, // 0-9; 8 is a good size/speed tradeoff
      adaptiveFiltering: true,
    });
    mimeType = "image/png";
  } else if (fmt === "webp") {
    pipeline = pipeline.webp({
      quality: options.quality ?? 82,
      effort: 4, // 0-6; higher = smaller file but slower
    });
    mimeType = "image/webp";
  } else {
    // JPEG — default path for ad images
    pipeline = pipeline.jpeg({
      quality: options.quality ?? 82,
      mozjpeg: true,       // better compression, ~15-25 % smaller vs stock libjpeg
      progressive: true,   // progressive JPEG for better perceived loading in viewers
      optimiseCoding: true,
    });
    mimeType = "image/jpeg";
  }

  // ── 7. Process and return data-URI ───────────────────────────────────────
  try {
    const outBuffer = await pipeline.toBuffer();
    const b64 = outBuffer.toString("base64");
    return `data:${mimeType};base64,${b64}`;
  } catch (err) {
    console.error(`[image-utils] sharp processing failed for ${url}:`, err);
    return null;
  }
}
