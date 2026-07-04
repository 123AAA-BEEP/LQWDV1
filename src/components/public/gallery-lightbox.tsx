"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export interface LightboxImage {
  url: string;
  alt: string;
}

/**
 * Project gallery with an in-page lightbox: click a tile to zoom, arrows /
 * swipe to move through the set, Esc or backdrop to close. Replaces the old
 * open-in-a-new-tab links. First tile goes large when the set is big enough,
 * matching the previous mosaic.
 */
export function GalleryLightbox({ images }: { images: LightboxImage[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [touchX, setTouchX] = useState<number | null>(null);

  const count = images.length;
  const prev = useCallback(
    () => setOpen((i) => (i === null ? i : (i + count - 1) % count)),
    [count],
  );
  const next = useCallback(
    () => setOpen((i) => (i === null ? i : (i + 1) % count)),
    [count],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    // Lock page scroll behind the overlay.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, prev, next]);

  if (count === 0) return null;
  const current = open !== null ? images[open] : null;

  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((g, i) => (
          <button
            key={g.url}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`View photo ${i + 1} of ${count}`}
            className={`group cursor-zoom-in overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${
              i === 0 && count > 2 ? "col-span-2 row-span-2" : ""
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={g.url}
              alt={g.alt}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              style={{ aspectRatio: i === 0 && count > 2 ? undefined : "4 / 3" }}
            />
          </button>
        ))}
      </div>

      {current ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4"
          onClick={() => setOpen(null)}
          onTouchStart={(e) => setTouchX(e.touches[0]?.clientX ?? null)}
          onTouchEnd={(e) => {
            const endX = e.changedTouches[0]?.clientX;
            if (touchX !== null && endX !== undefined) {
              const dx = endX - touchX;
              if (dx > 48) prev();
              else if (dx < -48) next();
            }
            setTouchX(null);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={current.alt}
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(null)}
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
          >
            <X aria-hidden className="size-5" />
          </button>

          {count > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 sm:left-5"
              >
                <ChevronLeft aria-hidden className="size-6" />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 sm:right-5"
              >
                <ChevronRight aria-hidden className="size-6" />
              </button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white">
                {(open ?? 0) + 1} / {count}
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
