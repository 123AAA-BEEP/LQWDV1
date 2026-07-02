"use client";

/**
 * Mobile-only sticky lead CTA. On small screens the lead form lives far below
 * the fold; this keeps the highest-intent action one tap away at all times.
 */
export function StickyCta({ label }: { label: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur lg:hidden">
      <button
        type="button"
        onClick={() =>
          document
            .getElementById("request-info")
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
        className="flex h-12 w-full items-center justify-center rounded-lg bg-ink text-base font-semibold text-white"
      >
        {label}
      </button>
    </div>
  );
}
