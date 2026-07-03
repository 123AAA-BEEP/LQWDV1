/**
 * Branded stand-in for project cards whose hero hasn't been sourced yet —
 * an intentional-looking ink gradient with the project's initial, instead of
 * a gray "No image" void. Purely decorative (cards carry their own alt/title).
 */
export function ImagePlaceholder({ name }: { name: string }) {
  const initial = (name.trim().charAt(0) || "•").toUpperCase();
  return (
    <div
      aria-hidden
      className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-ink via-slate-800 to-brand-900"
    >
      <span
        className="text-6xl font-semibold text-white/20"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {initial}
      </span>
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
        Renderings coming soon
      </span>
    </div>
  );
}
