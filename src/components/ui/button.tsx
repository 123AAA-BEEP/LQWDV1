"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "white"
  | "outlineLight";
export type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-slate-800",
  secondary:
    "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
  ghost: "text-slate-700 hover:bg-slate-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
  // For use on dark backgrounds (e.g. the ink CTA panel).
  white: "bg-white text-ink hover:bg-slate-100",
  outlineLight: "border border-slate-700 text-white hover:bg-slate-800",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

/** Exported so pending-aware wrappers (e.g. NavButtonLink) can share the look. */
export function buttonClasses(
  variant: Variant = "primary",
  size: Size = "md",
  className?: string,
) {
  return cn(base, variants[variant], sizes[size], className);
}

/**
 * Every submit Button is pending-aware for free: while the surrounding form's
 * server action runs, the button disables itself and shows a spinner — no
 * frozen screens, no double-submits, anywhere on the platform. (useFormStatus
 * reads the nearest parent <form>; outside a form it's simply never pending.)
 */
export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  disabled,
  type,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  const { pending } = useFormStatus();
  const busy = pending && type === "submit";
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || busy}
      {...props}
    >
      {busy ? (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
