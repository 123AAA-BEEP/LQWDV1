import "server-only";
import sharp from "sharp";

/**
 * Downscales an image before it goes to a vision model call. Anthropic
 * bills vision input by the resized pixel area (~(w*h)/750 tokens, capped
 * at a 1568px long edge server-side): a multi-MB 4000px rendering costs
 * ~3,300 tokens as sent, ~1,300 at 1100px — with no accuracy loss for
 * classification ("rendering or floor plan?") or brand-palette reads. It
 * also slashes request payloads: several call sites were base64-encoding
 * 6-8MB originals.
 *
 * Applied ONLY at the API-call boundary — stored gallery/hero originals
 * are never touched.
 *
 * Returns null on any decode failure or when re-encoding doesn't actually
 * shrink the payload; callers then send the original untouched, so a weird
 * format degrades to the old behaviour instead of erroring.
 */
export async function downscaleForVision(
  buf: Buffer,
  maxEdge = 1100,
): Promise<{ buf: Buffer; mediaType: "image/jpeg" } | null> {
  try {
    const img = sharp(buf, { failOn: "none" });
    const meta = await img.metadata();
    if (!meta.width || !meta.height) return null;
    const out = await img
      .rotate() // bake EXIF orientation in before metadata is dropped
      .resize({
        width: maxEdge,
        height: maxEdge,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return out.length < buf.length ? { buf: out, mediaType: "image/jpeg" } : null;
  } catch {
    return null;
  }
}

/** Same contract for base64 payloads (email attachments, pre-encoded fetches). */
export async function downscaleBase64ForVision(
  base64: string,
  maxEdge = 1100,
): Promise<{ base64: string; mediaType: "image/jpeg" } | null> {
  try {
    const out = await downscaleForVision(Buffer.from(base64, "base64"), maxEdge);
    return out
      ? { base64: out.buf.toString("base64"), mediaType: out.mediaType }
      : null;
  } catch {
    return null;
  }
}
