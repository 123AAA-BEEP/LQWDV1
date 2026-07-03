"use client";

import { useState } from "react";
import { ImagePlaceholder } from "./image-placeholder";

/**
 * Project image that can never look broken. Hero URLs are often hotlinked
 * from builder sites and die without warning — when one 404s (or was null to
 * begin with), the branded placeholder takes over instead of the browser's
 * broken-image glyph + alt-text spill.
 */
export function CardImage({
  src,
  alt,
  name,
  className = "h-full w-full object-cover",
}: {
  src: string | null;
  alt: string;
  /** Project name — drives the placeholder initial. */
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <ImagePlaceholder name={name} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
