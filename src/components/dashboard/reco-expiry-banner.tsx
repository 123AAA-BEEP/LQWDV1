import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * In-app nudge to re-upload a RECO certificate. Shows when the stored RECO
 * expiry is within 30 days (amber) or already past (red). Renders nothing
 * otherwise, so it's safe to mount for any user.
 */
export function RecoExpiryBanner({ expiry }: { expiry: string | null }) {
  if (!expiry) return null;
  const exp = new Date(`${expiry}T00:00:00`);
  if (Number.isNaN(exp.getTime())) return null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const days = Math.round((exp.getTime() - startOfToday.getTime()) / 86_400_000);
  if (days > 30) return null;

  const expired = days < 0;
  const dateStr = exp.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-sm",
        expired
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-amber-200 bg-amber-50 text-amber-800",
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          {expired ? (
            <>
              Your RECO registration <span className="font-semibold">expired on {dateStr}</span>.
              Re-upload your renewed certificate to keep your account verified.
            </>
          ) : (
            <>
              Your RECO registration expires in{" "}
              <span className="font-semibold">
                {days} {days === 1 ? "day" : "days"}
              </span>{" "}
              (on {dateStr}). Upload your renewed certificate to stay verified.
            </>
          )}
        </p>
      </div>
      <Link
        href="/dashboard/verify"
        className={cn(
          "shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold text-white",
          expired ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700",
        )}
      >
        Re-upload certificate
      </Link>
    </div>
  );
}
