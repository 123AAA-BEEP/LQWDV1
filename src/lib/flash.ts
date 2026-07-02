import { redirect } from "next/navigation";

/**
 * Redirect-with-message: the one way server actions confirm an outcome.
 * The target page renders the message via <FlashNotice /> from the `flash`
 * and `flash_tone` search params — no per-page message maps.
 */
export type FlashTone = "success" | "error" | "info" | "warning";

export function redirectWithFlash(
  path: string,
  message: string,
  tone: FlashTone = "success",
): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(
    `${path}${sep}flash=${encodeURIComponent(message)}&flash_tone=${tone}`,
  );
}

const TONES: FlashTone[] = ["success", "error", "info", "warning"];

/** Parse the flash params a page received (returns null when absent). */
export function flashFromSearchParams(sp: {
  flash?: string;
  flash_tone?: string;
}): { message: string; tone: FlashTone } | null {
  if (!sp.flash) return null;
  const tone = TONES.includes(sp.flash_tone as FlashTone)
    ? (sp.flash_tone as FlashTone)
    : "success";
  return { message: sp.flash, tone };
}
