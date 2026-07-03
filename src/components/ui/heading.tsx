import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/**
 * Typography primitives — the one eyebrow/section-title treatment, so pages
 * stop hand-rolling tracking/weight/size variants.
 *
 *   <Eyebrow>Part 1</Eyebrow>          — small uppercase overline label
 *   <SectionHeading>Gallery</…>        — the standard section h2
 */

export function Eyebrow({
  as: Tag = "p",
  className,
  ...props
}: ComponentProps<"p"> & { as?: "p" | "h2" | "h3"; className?: string }) {
  return (
    <Tag
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500",
        className,
      )}
      {...props}
    />
  );
}

export function SectionHeading({
  className,
  ...props
}: ComponentProps<"h2"> & { className?: string }) {
  return (
    <h2
      className={cn(
        "text-xl font-semibold tracking-tight text-ink",
        className,
      )}
      {...props}
    />
  );
}
