import type { LucideIcon } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

/** Considered empty state — icon + title + one line, optional CTA. Replaces
 *  bare centered gray text so empty surfaces still feel intentional. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="size-6" strokeWidth={1.75} aria-hidden />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-slate-700">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-slate-400">{description}</p>
      ) : null}
      {actionHref && actionLabel ? (
        <ButtonLink href={actionHref} size="sm" className="mt-5">
          {actionLabel}
        </ButtonLink>
      ) : null}
    </div>
  );
}
