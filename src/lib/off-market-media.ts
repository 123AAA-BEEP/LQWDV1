import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * off-market-media is a PRIVATE bucket (migration 0060): the board is
 * approved-realtor content, so images render through short-lived signed URLs
 * instead of public ones. The DB stores bare storage paths; the one-hour
 * expiry comfortably outlives a browse session and the URLs die after that.
 */

const BUCKET = "off-market-media";
const SIGN_TTL_SECONDS = 60 * 60;

/** Accepts a stored value in either form (bare path, or a full URL from the
 *  public-bucket era) and returns the storage path. */
export function offMarketPath(value: string): string {
  return value
    .replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|sign)\/off-market-media\//, "")
    .split("?")[0];
}

/**
 * Replaces every listing's image_urls with signed URLs, in ONE storage call
 * across the whole page of listings. Unsignable entries (deleted objects)
 * drop out rather than rendering broken images.
 */
export async function signListingImages<
  T extends { image_urls: string[] | null },
>(listings: T[]): Promise<T[]> {
  const allPaths = [
    ...new Set(
      listings.flatMap((l) => (l.image_urls ?? []).map(offMarketPath)).filter(Boolean),
    ),
  ];
  if (allPaths.length === 0) return listings;

  const admin = createAdminClient();
  const { data } = await admin.storage
    .from(BUCKET)
    .createSignedUrls(allPaths, SIGN_TTL_SECONDS);
  const signed = new Map<string, string>();
  for (const d of data ?? []) {
    if (d.path && d.signedUrl && !d.error) signed.set(d.path, d.signedUrl);
  }

  return listings.map((l) => ({
    ...l,
    image_urls: (l.image_urls ?? [])
      .map((u) => signed.get(offMarketPath(u)))
      .filter((u): u is string => Boolean(u)),
  }));
}
