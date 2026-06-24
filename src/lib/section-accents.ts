/**
 * Color-coded section accents shared by the dashboard sidebar and home, so the
 * intent buckets read as distinct zones at a glance:
 *   emerald = make money / transact   ·  amber = promote / spotlight
 *   sky     = explore / research      ·  slate = account / manage
 *
 * Class strings are literal so Tailwind's scanner keeps them.
 */
export type SectionAccent = "emerald" | "sky" | "amber" | "slate";

export const SECTION_ACCENT: Record<
  SectionAccent,
  {
    zone: string; // faint tinted container + ring
    header: string; // section header text
    chip: string; // icon chip background/text
    activeItem: string; // active nav item background/text
    activeIcon: string; // active nav item icon
    dotBg: string; // small accent dot / home header
  }
> = {
  emerald: {
    zone: "bg-emerald-50/60 ring-emerald-100",
    header: "text-emerald-700",
    chip: "bg-emerald-100 text-emerald-700",
    activeItem: "bg-emerald-100 text-emerald-900",
    activeIcon: "text-emerald-600",
    dotBg: "bg-emerald-500",
  },
  sky: {
    zone: "bg-sky-50/50 ring-sky-100",
    header: "text-sky-700",
    chip: "bg-sky-100 text-sky-700",
    activeItem: "bg-sky-100 text-sky-900",
    activeIcon: "text-sky-600",
    dotBg: "bg-sky-500",
  },
  amber: {
    zone: "bg-amber-50/60 ring-amber-100",
    header: "text-amber-700",
    chip: "bg-amber-100 text-amber-700",
    activeItem: "bg-amber-100 text-amber-900",
    activeIcon: "text-amber-600",
    dotBg: "bg-amber-500",
  },
  slate: {
    zone: "bg-slate-50 ring-slate-200",
    header: "text-slate-500",
    chip: "bg-slate-200 text-slate-600",
    activeItem: "bg-slate-200 text-slate-900",
    activeIcon: "text-slate-600",
    dotBg: "bg-slate-300",
  },
};
