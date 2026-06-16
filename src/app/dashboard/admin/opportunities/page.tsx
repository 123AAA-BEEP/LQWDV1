import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  OPPORTUNITY_STATUS,
  formatMoney,
  formatCommission,
} from "@/lib/opportunities";
import type { OpportunityStatus } from "@/lib/opportunities";
import { setOpportunityAdminStatus, setDeveloperAccess } from "./actions";

export const metadata: Metadata = { title: "Opportunities (admin)" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  title: string;
  status: OpportunityStatus;
  city: string | null;
  asking_price: number | null;
  commission_percent: number | null;
  admin_notes: string | null;
  created_at: string;
  developer: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  bids: { count: number }[];
}

const MESSAGES: Record<string, string> = {
  updated: "Opportunity updated.",
  role: "Account role updated.",
};

export default async function AdminOpportunities({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { message, error } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("opportunities")
    .select(
      "id, title, status, city, asking_price, commission_percent, admin_notes, created_at, developer:profiles!developer_id(first_name,last_name,email), bids:opportunity_bids(count)",
    )
    .order("created_at", { ascending: false });

  const rows = (data as unknown as Row[]) ?? [];

  return (
    <div className="space-y-8">
      {message && MESSAGES[message] ? (
        <Notice tone="success">{MESSAGES[message]}</Notice>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Developer access
        </h2>
        <Card>
          <CardBody>
            <form
              action={setDeveloperAccess}
              className="flex flex-wrap items-end gap-3"
            >
              <div className="min-w-56 flex-1">
                <Field label="Account email" htmlFor="email">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="developer@example.com"
                    required
                  />
                </Field>
              </div>
              <Field label="Role" htmlFor="role">
                <Select id="role" name="role" defaultValue="developer">
                  <option value="developer">Developer (enable)</option>
                  <option value="realtor">Realtor (revoke)</option>
                </Select>
              </Field>
              <Button type="submit" size="sm">
                Apply
              </Button>
            </form>
            <p className="mt-2 text-xs text-slate-500">
              Enabling “developer” gives a paying account the developer console
              to list opportunities.
            </p>
          </CardBody>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          All opportunities ({rows.length})
        </h2>
        {rows.length === 0 ? (
          <Card>
            <CardBody className="text-center text-sm text-slate-500">
              No opportunities have been created yet.
            </CardBody>
          </Card>
        ) : (
          rows.map((r) => {
            const dev =
              [r.developer?.first_name, r.developer?.last_name]
                .filter(Boolean)
                .join(" ") ||
              r.developer?.email ||
              "Unknown developer";
            const bidCount = r.bids?.[0]?.count ?? 0;
            return (
              <Card key={r.id}>
                <CardBody className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-800">{r.title}</p>
                      <p className="text-xs text-slate-400">
                        {dev} ·{" "}
                        {[
                          r.city,
                          formatMoney(r.asking_price),
                          formatCommission(r.commission_percent),
                          `${bidCount} bid(s)`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <Badge tone={OPPORTUNITY_STATUS[r.status].tone}>
                      {OPPORTUNITY_STATUS[r.status].label}
                    </Badge>
                  </div>

                  {r.admin_notes ? (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      Admin note: {r.admin_notes}
                    </p>
                  ) : null}

                  <form
                    action={setOpportunityAdminStatus}
                    className="space-y-2 border-t border-slate-100 pt-3"
                  >
                    <input type="hidden" name="opportunity_id" value={r.id} />
                    <Textarea
                      name="admin_notes"
                      defaultValue={r.admin_notes ?? ""}
                      placeholder="Moderation note (shown to the developer on suspend)…"
                    />
                    <div className="flex flex-wrap gap-2">
                      {r.status !== "suspended" ? (
                        <Button
                          type="submit"
                          name="status"
                          value="suspended"
                          size="sm"
                          variant="danger"
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          name="status"
                          value="open"
                          size="sm"
                        >
                          Restore (open)
                        </Button>
                      )}
                      <Button
                        type="submit"
                        name="status"
                        value="closed"
                        size="sm"
                        variant="secondary"
                      >
                        Close
                      </Button>
                    </div>
                  </form>
                </CardBody>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}
