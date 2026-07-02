"use client";

import Link, { useLinkStatus } from "next/link";
import { buttonClasses, type Variant, type Size } from "./button";

/** Must live INSIDE the Link to read its navigation status. */
function LabelWithStatus({
  children,
  pendingLabel,
}: {
  children: React.ReactNode;
  pendingLabel: string;
}) {
  const { pending } = useLinkStatus();
  if (!pending) return <>{children}</>;
  return (
    <>
      <span
        className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
        aria-hidden
      />
      {pendingLabel}
    </>
  );
}

/**
 * A ButtonLink that shows a spinner + pending label while the destination
 * route loads — for slow, high-stakes navigations (e.g. claim → dashboard)
 * where a frozen screen makes users click twice.
 */
export function NavButtonLink({
  href,
  children,
  pendingLabel = "Opening…",
  variant = "primary",
  size = "md",
  className,
}: {
  href: string;
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)}>
      <LabelWithStatus pendingLabel={pendingLabel}>{children}</LabelWithStatus>
    </Link>
  );
}
