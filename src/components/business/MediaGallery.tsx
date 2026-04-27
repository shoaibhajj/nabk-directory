"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X, Play } from "lucide-react";
import { detectVideoEmbed, videoPosterUrl, type VideoEmbed } from "@/lib/video";

export interface GalleryImage {
  id: string;
  url: string;
}
export interface GalleryVideo {
  id: string;
  url: string;
}

interface MediaGalleryProps {
  businessName: string;
  images: GalleryImage[];
  videos: GalleryVideo[];
  /**
   * Rendered behind the cover when there is no image so the page still has
   * a hero. The parent page already knows what to draw — keep the gallery
   * focused on real media.
   */
  emptyHero?: React.ReactNode;
}

export function MediaGallery({
  businessName,
  images,
  videos,
  emptyHero,
}: MediaGalleryProps) {
  const cover = images[0] ?? null;
  const restImages = images.slice(1);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const close = useCallback(() => setOpenIdx(null), []);
  const next = useCallback(
    () => setOpenIdx((i) => (i === null ? null : (i + 1) % images.length)),
    [images.length],
  );
  const prev = useCallback(
    () =>
      setOpenIdx((i) =>
        i === null ? null : (i - 1 + images.length) % images.length,
      ),
    [images.length],
  );

  useEffect(() => {
    if (openIdx === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") {
        // RTL: ArrowRight visually goes to the previous item
        prev();
      } else if (e.key === "ArrowLeft") {
        next();
      }
    }
    window.addEventListener("keydown", onKey);
    // Lock background scroll while the lightbox is open.
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = original;
    };
  }, [openIdx, close, next, prev]);

  const decodedVideos = useMemo(() => {
    const out: { id: string; embed: VideoEmbed }[] = [];
    for (const v of videos) {
      const embed = detectVideoEmbed(v.url);
      if (embed) out.push({ id: v.id, embed });
    }
    return out;
  }, [videos]);

  return (
    <>
      {cover ? (
        <button
          type="button"
          onClick={() => setOpenIdx(0)}
          className="group relative block aspect-[16/6] w-full overflow-hidden rounded-3xl bg-muted"
          aria-label="فتح الصورة بحجم أكبر"
        >
          <Image
            src={cover.url}
            alt={businessName}
            fill
            className="object-cover transition-transform group-hover:scale-[1.02]"
            sizes="100vw"
            unoptimized
          />
          <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
        </button>
      ) : (
        emptyHero
      )}

      {restImages.length > 0 && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-xl font-bold">معرض الصور</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {restImages.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setOpenIdx(i + 1)}
                className="group relative aspect-square overflow-hidden rounded-xl bg-muted"
                aria-label="فتح الصورة بحجم أكبر"
              >
                <Image
                  src={m.url}
                  alt=""
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="33vw"
                  unoptimized
                />
              </button>
            ))}
          </div>
        </section>
      )}

      {decodedVideos.length > 0 && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-xl font-bold">الفيديوهات</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {decodedVideos.map((v) => (
              <div
                key={v.id}
                className="relative aspect-video overflow-hidden rounded-xl bg-black"
              >
                {v.embed.provider === "direct" ? (
                  <video
                    src={v.embed.embedUrl}
                    controls
                    preload="metadata"
                    className="h-full w-full"
                  />
                ) : (
                  <iframe
                    src={v.embed.embedUrl}
                    title="فيديو"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {openIdx !== null && images[openIdx] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="عرض الصورة"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={close}
        >
          <button
            type="button"
            aria-label="إغلاق"
            onClick={close}
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="السابق"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 md:right-8"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label="التالي"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 md:left-8"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            </>
          )}

          <div
            className="relative max-h-[90vh] max-w-[95vw] md:max-w-[80vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Use a regular img here so we can size to the natural aspect
                ratio without specifying width/height. The optimizer is
                bypassed which is fine for a single-shot lightbox view. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[openIdx].url}
              alt={businessName}
              className="max-h-[90vh] max-w-full rounded-xl object-contain"
            />
            {images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                {openIdx + 1} / {images.length}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Tiny helper used by dashboard cards. Renders a play overlay on top of a
 * provider thumbnail when available, otherwise a generic black tile.
 */
export function VideoThumbnail({ url }: { url: string }) {
  const embed = detectVideoEmbed(url);
  const poster = embed ? videoPosterUrl(embed) : null;
  return (
    <div className="relative h-32 w-full overflow-hidden bg-black">
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          className="h-full w-full object-cover opacity-90"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-white/60">
          فيديو
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">
          <Play className="h-5 w-5 fill-current" />
        </div>
      </div>
    </div>
  );
}
