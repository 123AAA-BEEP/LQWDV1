import type { Metadata } from "next";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlashNotice } from "@/components/ui/flash-notice";
import { moderateReview } from "./actions";

export const metadata: Metadata = { title: "Reviews" };
export const dynamic = "force-dynamic";

interface Review {
  id: string;
  agent_profile_id: string;
  reviewer_name: string;
  reviewer_email: string;
  rating: number;
  body: string;
  worked_on: string | null;
  status: string;
  created_at: string;
}
interface Prof {
  id: string;
  first_name: string | null;
  last_name: string | null;
  slug: string | null;
}

function agentName(p: Prof | undefined): string {
  if (!p) return "Unknown agent";
  return [p.first_name, p.last_name].filter(Boolean).join(" ") || "Agent";
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={
            rating >= n
              ? "size-4 fill-amber-400 text-amber-400"
              : "size-4 text-slate-300"
          }
          strokeWidth={1.5}
          aria-hidden
        />
      ))}
    </span>
  );
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ flash?: string; flash_tone?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  // Admin RLS returns every review; pending first, then recent decisions.
  const { data } = await supabase
    .from("agent_reviews")
    .select(
      "id, agent_profile_id, reviewer_name, reviewer_email, rating, body, worked_on, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  const all = (data as Review[] | null) ?? [];
  const pending = all.filter((r) => r.status === "pending");
  const decided = all.filter((r) => r.status !== "pending").slice(0, 30);

  const profileIds = [...new Set(all.map((r) => r.agent_profile_id))];
  const profById = new Map<string, Prof>();
  if (profileIds.length) {
    const { data: profData } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, slug")
      .in("id", profileIds);
    for (const p of (profData as Prof[] | null) ?? []) profById.set(p.id, p);
  }

  const ReviewCard = ({ r, moderated }: { r: Review; moderated?: boolean }) => {
    const agent = profById.get(r.agent_profile_id);
    return (
      <Card key={r.id}>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Stars rating={r.rating} />
                <span className="text-sm font-semibold text-slate-800">
                  {r.reviewer_name}
                </span>
                <span className="text-xs text-slate-400">
                  {r.reviewer_email}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {new Date(r.created_at).toLocaleString("en-CA")} · for{" "}
                {agent?.slug ? (
                  <a
                    href={`/realtors/${agent.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-700 hover:underline"
                  >
                    {agentName(agent)}
                  </a>
                ) : (
                  agentName(agent)
                )}
                {r.worked_on ? <> · {r.worked_on}</> : null}
              </p>
            </div>
            {moderated ? (
              <Badge tone={r.status === "approved" ? "success" : "neutral"}>
                {r.status === "approved" ? "Approved" : "Rejected"}
              </Badge>
            ) : (
              <Badge tone="warning">Pending</Badge>
            )}
          </div>

          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            {r.body}
          </p>

          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <form action={moderateReview}>
              <input type="hidden" name="review_id" value={r.id} />
              <input type="hidden" name="decision" value="approved" />
              <Button
                type="submit"
                size="sm"
                variant={moderated ? "secondary" : "primary"}
                disabled={r.status === "approved"}
              >
                Approve
              </Button>
            </form>
            <form action={moderateReview}>
              <input type="hidden" name="review_id" value={r.id} />
              <input type="hidden" name="decision" value="rejected" />
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                disabled={r.status === "rejected"}
              >
                Reject
              </Button>
            </form>
          </div>
        </CardBody>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <FlashNotice searchParams={sp} />
      <div>
        <h2 className="text-lg font-semibold text-ink">Client reviews</h2>
        <p className="mt-1 text-sm text-slate-500">
          Every review is held here until approved — nothing publishes without
          a human pass. Approve only genuine client reviews (no agents, no
          family, no self-reviews); agents reuse these in their own
          advertising, so the bar is &quot;would we defend it to RECO&quot;.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-amber-700">
          Pending ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <Card>
            <CardBody className="py-8 text-center text-sm text-slate-500">
              No reviews waiting on moderation.
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <ReviewCard key={r.id} r={r} />
            ))}
          </div>
        )}
      </section>

      {decided.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
            Recently moderated
          </h3>
          <div className="space-y-3">
            {decided.map((r) => (
              <ReviewCard key={r.id} r={r} moderated />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
