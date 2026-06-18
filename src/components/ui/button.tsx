import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "white"
  | "outlineLight";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 active:translate-y-px disabled:opacity-50 disabled:pointer-events-none disabled:active:translate-y-0 whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-white shadow-sm hover:bg-slate-800 hover:shadow-md",
  secondary:
    "border border-slate-300 bg-white text-slate-900 shadow-sm hover:bg-slate-50 hover:border-slate-400",
  ghost: "text-slate-700 hover:bg-slate-100",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow-md",
  // For use on dark backgrounds (e.g. the ink CTA panel).
  white: "bg-white text-ink shadow-sm hover:bg-slate-100",
  outlineLight: "border border-slate-700 text-white hover:bg-slate-800",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

function classes(variant: Variant, size: Size, className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={classes(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={classes(variant, size, className)} {...props} />;
}
