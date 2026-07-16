import { ButtonLink } from "@/components/ui/button";

/**
 * "Your lead path" — the first-session orientation module that ties the
 * dashboard straight to the landing promise: free buyer leads, no referral
 * fees, from your current brokerage. Numbers are real (matched pages + buyer
 * inquiries from the Lead Pages model); the $0 referral fee is a deliberate
 * reinforcement of the offer, not a computed value.
 */
export function LeadPathStatus({
  matchedPages,
  buyerInquiries,
}: {
  matchedPages: number;
  buyerInquiries: number;
}) {
  const started = matchedPages > 0 || buyerInquiries > 0;
  // Deepest live step wins: inquiries → the Leads inbox; pages only → Lead
  // Pages (share a link); nothing yet → the setup guide.
  const cta =
    buyerInquiries > 0
      ? { href: "/dashboard/leads", label: "Open your leads" }
      : started
        ? { href: "/dashboard/lead-pages", label: "Open Lead Pages" }
        : { href: "/dashboard/get-free-leads", label: "Start getting leads" };
  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Your lead path
          </p>
          <h2 className="mt-1 text-lg font-semibold text-ink">
            Free buyer leads from your project pages
          </h2>
        </div>
        <ButtonLink href={cta.href} size="sm">
          {cta.label}
        </ButtonLink>
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-3">
        <Metric
          label="Matched project pages"
          value={String(matchedPages)}
          hint={started ? "you're the agent" : "submit or update a project"}
        />
        <Metric
          label="Buyer inquiries"
          value={String(buyerInquiries)}
          hint="attributed to you"
        />
        <Metric label="Referral fees" value="$0" hint="no platform split, ever" />
      </dl>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums text-ink">
        {value}
      </dd>
      <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
    </div>
  );
}
