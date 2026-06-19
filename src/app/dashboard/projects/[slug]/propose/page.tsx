import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUserProfile, isApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { VerificationRequired } from "@/components/dashboard/locked";
import { submitProposal } from "./actions";

export const metadata: Metadata = { title: "Submit a proposal" };
export const dynamic = "force-dynamic";

export default async function ProposePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;
  const { profile } = await requireUserProfile();

  if (!isApproved(profile)) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Submit a proposal
        </h1>
        <VerificationRequired />
      </div>
    );
  }

  const supabase = await createClient();
  // Broker-safe view (base `projects` SELECT is admin-only).
  const { data: project } = await supabase
    .from("broker_projects_view")
    .select("id, slug, project_name")
    .eq("slug", slug)
    .maybeSingle();

  if (!project) notFound();

  const { data: commercials } = await supabase
    .from("project_private_commercials")
    .select(
      "commission_is_negotiable, price_is_negotiable, incentives_are_negotiable",
    )
    .eq("project_id", project.id)
    .maybeSingle();

  const negotiable = [
    commercials?.commission_is_negotiable ? "commission" : null,
    commercials?.price_is_negotiable ? "price" : null,
    commercials?.incentives_are_negotiable ? "incentives" : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/projects/${slug}`}
          className="text-sm text-brand-700 hover:underline"
        >
          ← Back to {project.project_name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          Submit a proposal
        </h1>
        <p className="mt-1 text-slate-500">
          Propose better terms on{" "}
          <span className="font-medium text-slate-700">
            {project.project_name}
          </span>{" "}
          — and say what you’ll commit to in exchange. An admin reviews every
          proposal before it reaches the developer.
        </p>
      </div>

      {negotiable.length > 0 ? (
        <Notice tone="info">
          The developer has flagged{" "}
          <span className="font-medium">{negotiable.join(", ")}</span> as
          negotiable on this project.
        </Notice>
      ) : null}

      {error ? <Notice tone="error">{error}</Notice> : null}

      <Card>
        <CardBody>
          <form action={submitProposal} className="space-y-5">
            <input type="hidden" name="slug" value={project.slug} />
            <input type="hidden" name="project_id" value={project.id} />

            <Field
              label="Proposal type"
              htmlFor="proposal_format"
              hint="Worksheet captures specific asks. Freeform is an open letter."
            >
              <Select
                id="proposal_format"
                name="proposal_format"
                defaultValue="worksheet"
              >
                <option value="worksheet">Worksheet — structured asks</option>
                <option value="freeform">Freeform — open proposal</option>
              </Select>
            </Field>

            <fieldset className="space-y-4 rounded-lg border border-slate-200 p-4">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Your asks (worksheet)
              </legend>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Commission ask (%)"
                  htmlFor="commission_ask_percent"
                  hint="The commission you’re requesting."
                >
                  <Input
                    id="commission_ask_percent"
                    name="commission_ask_percent"
                    type="number"
                    step="0.25"
                    min="0"
                    placeholder="e.g. 5"
                  />
                </Field>

                <Field
                  label="Price reduction ask ($)"
                  htmlFor="price_reduction_ask"
                  hint="Per-unit reduction you’re seeking."
                >
                  <Input
                    id="price_reduction_ask"
                    name="price_reduction_ask"
                    type="number"
                    step="1000"
                    min="0"
                    placeholder="e.g. 25000"
                  />
                </Field>
              </div>

              <Field
                label="Incentive ask"
                htmlFor="incentive_ask"
                hint="Changes to the incentive package (e.g. richer cashback, capped levies)."
              >
                <Textarea id="incentive_ask" name="incentive_ask" />
              </Field>
            </fieldset>

            <Field
              label="What you’ll commit to in exchange"
              htmlFor="consideration"
              hint="Required. e.g. a guaranteed marketing campaign, committed buyer(s), a volume or timeline commitment."
            >
              <Textarea id="consideration" name="consideration" required />
            </Field>

            <Field
              label="Additional context"
              htmlFor="narrative"
              hint="Required for a freeform proposal; optional otherwise."
            >
              <Textarea id="narrative" name="narrative" />
            </Field>

            <Field
              label="Offer valid until"
              htmlFor="valid_until"
              hint="Optional. After this date the proposal lapses."
            >
              <Input id="valid_until" name="valid_until" type="date" />
            </Field>

            <div className="flex items-center gap-3">
              <SubmitButton pendingLabel="Submitting…">
                Submit proposal
              </SubmitButton>
              <Link
                href={`/dashboard/projects/${slug}`}
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                Cancel
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
