import type { Metadata } from "next";
import Link from "next/link";
import { requireUserProfile, isDeveloper } from "@/lib/auth";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Notice } from "@/components/ui/notice";
import {
  RFP_TYPE_OPTIONS,
  rfpTypeLabel,
  RFP_HIDEABLE_FIELDS,
} from "@/lib/status";
import { createRfp } from "../actions";

export const metadata: Metadata = { title: "New deal request" };
export const dynamic = "force-dynamic";

export default async function NewDealRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { profile } = await requireUserProfile();
  const { error } = await searchParams;

  if (!isDeveloper(profile)) {
    return (
      <div className="space-y-6">
        <Header />
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            Deal requests are for developer accounts.
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />
      {error ? (
        <Notice tone="error">Couldn&apos;t save the deal request. Check the title and try again.</Notice>
      ) : null}

      <form action={createRfp} className="space-y-6">
        <Section title="The opportunity">
          <Field label="Title" htmlFor="title" hint="What realtors see first — e.g. “12-unit bulk purchase, downtown midrise”.">
            <Input id="title" name="title" required placeholder="Bulk purchase — 12 units" />
          </Field>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="rfp_type">
              <Select id="rfp_type" name="rfp_type" defaultValue="bulk_purchase">
                {RFP_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {rfpTypeLabel(t)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Side" htmlFor="deal_side">
              <Select id="deal_side" name="deal_side" defaultValue="buy">
                <option value="buy">Buy side (you&apos;re acquiring)</option>
                <option value="list">List side (you&apos;re selling)</option>
              </Select>
            </Field>
            <Field label="Target units" htmlFor="target_units">
              <Input id="target_units" name="target_units" inputMode="numeric" placeholder="12" />
            </Field>
            <Field label="Target price (CAD)" htmlFor="target_price">
              <Input id="target_price" name="target_price" inputMode="numeric" placeholder="9000000" />
            </Field>
            <Field label="Deadline" htmlFor="deadline_at">
              <Input id="deadline_at" name="deadline_at" type="date" />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Brief" htmlFor="brief" hint="Context for responders — scope, location, terms.">
              <Textarea id="brief" name="brief" placeholder="Describe the deal, location, and what you're looking for…" />
            </Field>
          </div>
        </Section>

        <Section title="Reach &amp; confidentiality">
          <Field label="Who can see this?" htmlFor="visibility">
            <Select id="visibility" name="visibility" defaultValue="all_ultra">
              <option value="all_ultra">All Ultra realtors (open)</option>
              <option value="invited">Invite-only (we&apos;ll help you target)</option>
            </Select>
          </Field>
          <p className="mt-3 text-sm text-slate-500">
            Hide specific fields from realtors until you&apos;re ready to share
            them (e.g. keep your target price private so it isn&apos;t anchored):
          </p>
          <div className="mt-2 space-y-2">
            {RFP_HIDEABLE_FIELDS.map((f) => (
              <label key={f.key} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name={`hide_${f.key}`} className="size-4 rounded border-slate-300" />
                Hide {f.label.toLowerCase()}
              </label>
            ))}
          </div>
        </Section>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="publish" defaultChecked className="size-4 rounded border-slate-300" />
          Publish now (uncheck to save as a draft)
        </label>

        <div className="flex items-center gap-3">
          <SubmitButton>Create deal request</SubmitButton>
          <Link href="/dashboard/deal-requests" className="text-sm text-slate-500 hover:text-slate-800">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function Header() {
  return (
    <div>
      <Link href="/dashboard/deal-requests" className="text-sm text-brand-700 hover:underline">
        ← Deal requests
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
        New deal request
      </h1>
      <p className="mt-1 text-slate-500">
        Post an RFP to Ultra realtors — bulk buys, listing mandates, inventory,
        or a full development.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardBody>
        <h2
          className="text-sm font-semibold uppercase tracking-wide text-slate-500"
          dangerouslySetInnerHTML={{ __html: title }}
        />
        <div className="mt-4">{children}</div>
      </CardBody>
    </Card>
  );
}
