import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  RFP_STATUS,
  RFP_TYPE_OPTIONS,
  RFP_HIDEABLE_FIELDS,
  rfpTypeLabel,
  dealSideLabel,
} from "@/lib/status";
import type { RfpStatus } from "@/lib/status";
import { createRfp } from "./actions";

export const metadata: Metadata = { title: "RFPs" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  title: string;
  rfp_type: string;
  deal_side: string;
  visibility: string;
  status: RfpStatus;
  deadline_at: string | null;
  created_at: string;
}

export default async function RfpsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("deal_rfps")
    .select(
      "id, title, rfp_type, deal_side, visibility, status, deadline_at, created_at",
    )
    .order("created_at", { ascending: false });

  const rows = (data as unknown as Row[]) ?? [];

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          New RFP
        </h2>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Card>
          <CardBody>
            <form action={createRfp} className="space-y-4">
              <Field label="Title" htmlFor="title">
                <Input
                  id="title"
                  name="title"
                  required
                  placeholder="e.g. 40-unit bulk purchase — Liberty Village"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Type" htmlFor="rfp_type">
                  <Select id="rfp_type" name="rfp_type" defaultValue="">
                    <option value="" disabled>
                      Choose…
                    </option>
                    {RFP_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {rfpTypeLabel(t)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Side" htmlFor="deal_side">
                  <Select id="deal_side" name="deal_side" defaultValue="buy">
                    <option value="buy">{dealSideLabel("buy")}</option>
                    <option value="list">{dealSideLabel("list")}</option>
                  </Select>
                </Field>
                <Field label="Visibility" htmlFor="visibility">
                  <Select id="visibility" name="visibility" defaultValue="invited">
                    <option value="invited">Invitation-only</option>
                    <option value="all_ultra">All ultra realtors</option>
                  </Select>
                </Field>
              </div>

              <Field label="Brief" htmlFor="brief" hint="What the developer wants to achieve.">
                <Textarea id="brief" name="brief" />
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Target units" htmlFor="target_units">
                  <Input id="target_units" name="target_units" type="number" min="0" />
                </Field>
                <Field label="Target price ($)" htmlFor="target_price">
                  <Input id="target_price" name="target_price" type="number" min="0" step="1000" />
                </Field>
                <Field label="Deadline" htmlFor="deadline_at">
                  <Input id="deadline_at" name="deadline_at" type="date" />
                </Field>
              </div>

              <fieldset className="rounded-lg border border-slate-200 p-3">
                <legend className="px-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Hide from realtors
                </legend>
                <p className="mb-2 text-xs text-slate-500">
                  Withhold sensitive details (e.g. the target price, so an
                  appraisal isn’t anchored low before closing). Hidden fields are
                  masked everywhere realtors see this deal.
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {RFP_HIDEABLE_FIELDS.map((f) => (
                    <label
                      key={f.key}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        name="hidden_fields"
                        value={f.key}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex flex-wrap items-center gap-2">
                <SubmitButton pendingLabel="Saving…">Save as draft</SubmitButton>
                <button
                  type="submit"
                  name="publish"
                  value="1"
                  className="text-sm text-brand-700 hover:underline"
                >
                  Save &amp; open for responses →
                </button>
              </div>
            </form>
          </CardBody>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          All RFPs ({rows.length})
        </h2>
        {rows.length === 0 ? (
          <Card>
            <CardBody className="text-center text-sm text-slate-500">
              No RFPs yet.
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody className="divide-y divide-slate-100 p-0">
              {rows.map((r) => (
                <Link
                  key={r.id}
                  href={`/dashboard/admin/rfps/${r.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {r.title}
                    </p>
                    <p className="text-xs text-slate-400">
                      {rfpTypeLabel(r.rfp_type)} · {dealSideLabel(r.deal_side)}
                      {r.deadline_at
                        ? ` · due ${new Date(r.deadline_at).toLocaleDateString("en-CA")}`
                        : ""}
                    </p>
                  </div>
                  <Badge tone={RFP_STATUS[r.status].tone}>
                    {RFP_STATUS[r.status].label}
                  </Badge>
                </Link>
              ))}
            </CardBody>
          </Card>
        )}
      </section>
    </div>
  );
}
