import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import type { VerificationStatus } from "@/lib/types";

type Tone = "neutral" | "success" | "warning" | "danger" | "brand";

const tones: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
  brand: "bg-brand-100 text-brand-800",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

const verificationTone: Record<VerificationStatus, Tone> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
  suspended: "danger",
};

export function verificationBadgeTone(status: VerificationStatus): Tone {
  return verificationTone[status];
}
