/**
 * Microsite brand primitives — kept free of "server-only" so the admin
 * content editor (a client component) can offer manual overrides of what
 * the vision pass extracted.
 */

/**
 * Visual identity pulled from the project's own marketing renderings (the
 * samples that arrive through the ingestion machine), or set by hand in the
 * admin editor: the microsite mimics the builder's palette and typography
 * instead of wearing LIQWD's.
 */
export interface MicrositeBrand {
  /** CTA/button colour, must carry white text. 6-digit hex. */
  primary: string;
  /** Secondary accent (chips, hovers). 6-digit hex. */
  accent: string;
  /** Google font name from BRAND_FONTS. */
  heading_font: string;
  font_stack: "serif" | "sans-serif";
}

/** Safe Google-font allowlist the brand extractor (and editor) picks from. */
export const BRAND_FONTS = [
  "Playfair Display",
  "Cormorant Garamond",
  "Libre Baskerville",
  "Lora",
  "Merriweather",
  "Source Serif 4",
  "Montserrat",
  "Poppins",
  "DM Sans",
  "Work Sans",
  "Inter",
  "Jost",
] as const;

export const BRAND_HEX = /^#[0-9a-fA-F]{6}$/;

/** Fonts in BRAND_FONTS that need a serif fallback stack. */
export const SERIF_FONTS: ReadonlySet<string> = new Set([
  "Playfair Display",
  "Cormorant Garamond",
  "Libre Baskerville",
  "Lora",
  "Merriweather",
  "Source Serif 4",
]);

/** Validates an arbitrary shape into a brand, or null. */
export function cleanBrandInput(raw: unknown): MicrositeBrand | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const primary = String(r.primary ?? r.primary_hex ?? "");
  const accent = String(r.accent ?? r.accent_hex ?? "");
  const font = String(r.heading_font ?? "");
  if (!BRAND_HEX.test(primary) || !BRAND_HEX.test(accent)) return null;
  if (!(BRAND_FONTS as readonly string[]).includes(font)) return null;
  return {
    primary: primary.toLowerCase(),
    accent: accent.toLowerCase(),
    heading_font: font,
    font_stack: r.font_stack === "serif" ? "serif" : "sans-serif",
  };
}
