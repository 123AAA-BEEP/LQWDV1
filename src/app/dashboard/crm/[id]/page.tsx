import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Textarea, Checkbox } from "@/components/ui/field";
import { FlashNotice } from "@/components/ui/flash-notice";
import {
  updateContact,
  addInterest,
  setInterestStatus,
  logActivity,
  addTask,
  completeTask,
} from "../actions";

export const metadata: Metadata = { title: "Contact" };
export const dynamic = "force-dynamic";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  contact_kind: string | null;
  notes: string | null;
  consent_email: boolean;
  consent_attested_at: string | null;
  archived: boolean;
  created_at: string;
}
interface Interest {
  id: string;
  project_id: string;
  status: string;
  created_at: string;
}
interface Activity {
  id: string;
  kind: string;
  outcome: string | null;
  created_at: string;
}
interface Task {
  id: string;
  title: string;
  due_on: string | null;
  done_at: string | null;
}

const KINDS = [
  ["buyer", "Buyer"],
  ["investor", "Investor"],
  ["seller", "Seller"],
  ["renter", "Renter"],
  ["past_client", "Past client"],
  ["other", "Other"],
] as const;

const INTEREST_TONE: Record<string, "brand" | "warning" | "success" | "neutral"> = {
  interested: "brand",
  sent_info: "warning",
  hot: "success",
  closed: "neutral",
};

const first = (v: unknown): string =>
  Array.isArray(v) ? String(v[0] ?? "") : typeof v === "string" ? v : "";

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const q = first(sp.q).trim();
  const { profile } = await requireUserProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("crm_contacts")
    .select(
      "id, name, email, phone, contact_kind, notes, consent_email, consent_attested_at, archived, created_at",
    )
    .eq("id", id)
    .eq("agent_profile_id", profile.id)
    .maybeSingle();
  const contact = (data as Contact | null) ?? null;
  if (!contact) notFound();

  const [{ data: intData }, { data: actData }, { data: taskData }] =
    await Promise.all([
      supabase
        .from("crm_contact_interests")
        .select("id, project_id, status, created_at")
        .eq("contact_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("crm_activities")
        .select("id, kind, outcome, created_at")
        .eq("contact_id", id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("crm_tasks")
        .select("id, title, due_on, done_at")
        .eq("contact_id", id)
        .order("done_at", { ascending: true, nullsFirst: true })
        .order("due_on")
        .limit(20),
    ]);
  const interests = (intData as Interest[] | null) ?? [];
  const activities = (actData as Activity[] | null) ?? [];
  const tasks = (taskData as Task[] | null) ?? [];

  // Resolve interest project names + optional picker search results.
  const projIds = interests.map((i) => i.project_id);
  const nameById = new Map<string, { name: string; slug: string | null }>();
  if (projIds.length) {
    const { data: projData } = await supabase
      .from("public_projects_view")
      .select("project_id, project_name, slug")
      .in("project_id", projIds);
    for (const p of (projData as
      | { project_id: string; project_name: string; slug: string | null }[]
      | null) ?? []) {
      nameById.set(p.project_id, { name: p.project_name, slug: p.slug });
    }
  }
  let hits: { project_id: string; project_name: string; city: string | null }[] = [];
  if (q) {
    const { data: hitData } = await supabase
      .from("public_projects_view")
      .select("project_id, project_name, city")
      .or(`project_name.ilike.%${q}%,city.ilike.%${q}%`)
      .order("project_name")
      .limit(10);
    hits =
      (hitData as
        | { project_id: string; project_name: string; city: string | null }[]
        | null) ?? [];
  }

  return (
    <div className="space-y-6">
      <FlashNotice
        searchParams={{ flash: first(sp.flash), flash_tone: first(sp.flash_tone) }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard/crm"
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            ← All clients
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {contact.name}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {contact.email ? (
              <a
                className="text-brand-700 hover:underline"
                href={`mailto:${encodeURIComponent(contact.email)}`}
              >
                {contact.email}
              </a>
            ) : null}
            {contact.email && contact.phone ? " · " : ""}
            {contact.phone ? (
              <a
                className="text-brand-700 hover:underline"
                href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}
              >
                {contact.phone}
              </a>
            ) : null}
          </p>
        </div>
        {contact.consent_email ? (
          <Badge tone="success">Newsletter consented</Badge>
        ) : (
          <Badge tone="neutral">No email consent</Badge>
        )}
      </div>

      {/* Quick log — the tel:/mailto buttons above do the reaching; this
          records what happened. */}
      <Card>
        <CardBody>
          <h2 className="text-sm font-semibold text-ink">Log a touch</h2>
          <form action={logActivity} className="mt-2 flex flex-wrap items-end gap-2">
            <input type="hidden" name="contact_id" value={contact.id} />
            <div className="min-w-32">
              <Field label="What" htmlFor="a_kind">
                <Select id="a_kind" name="kind" defaultValue="call">
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="text">Text</option>
                  <option value="meeting">Meeting</option>
                  <option value="note">Note</option>
                </Select>
              </Field>
            </div>
            <div className="min-w-64 flex-1">
              <Field label="Outcome / note" htmlFor="a_outcome">
                <Input
                  id="a_outcome"
                  name="outcome"
                  maxLength={1000}
                  placeholder="e.g. Left voicemail — wants 2-bed under $800K"
                />
              </Field>
            </div>
            <Button type="submit" variant="secondary">
              Log
            </Button>
          </form>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardBody>
              <h2 className="text-sm font-semibold text-ink">
                Projects they care about
              </h2>
              {interests.length > 0 ? (
                <ul className="mt-2 divide-y divide-slate-100">
                  {interests.map((i) => {
                    const meta = nameById.get(i.project_id);
                    return (
                      <li
                        key={i.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-2"
                      >
                        <div className="min-w-0">
                          {meta?.slug ? (
                            <Link
                              href={`/projects/${meta.slug}`}
                              target="_blank"
                              className="text-sm font-medium text-brand-700 hover:underline"
                            >
                              {meta.name}
                            </Link>
                          ) : (
                            <span className="text-sm text-slate-600">
                              {meta?.name ?? "Project"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone={INTEREST_TONE[i.status] ?? "neutral"}>
                            {i.status.replace("_", " ")}
                          </Badge>
                          {i.status !== "hot" && i.status !== "closed" ? (
                            <form action={setInterestStatus}>
                              <input type="hidden" name="interest_id" value={i.id} />
                              <input type="hidden" name="contact_id" value={contact.id} />
                              <input type="hidden" name="status" value="hot" />
                              <Button type="submit" size="sm" variant="secondary">
                                Mark hot
                              </Button>
                            </form>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  Nothing yet — search a project below to track it for them.
                </p>
              )}

              <form method="get" className="mt-3 flex items-center gap-2">
                <Input name="q" defaultValue={q} placeholder="Search projects…" />
                <Button type="submit" variant="secondary" size="sm">
                  Search
                </Button>
              </form>
              {hits.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {hits.map((h) => (
                    <li key={h.project_id}>
                      <form action={addInterest} className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-sm text-slate-600">
                          {h.project_name}
                          {h.city ? ` · ${h.city}` : ""}
                        </span>
                        <input type="hidden" name="contact_id" value={contact.id} />
                        <input type="hidden" name="project_id" value={h.project_id} />
                        <Button type="submit" size="sm" variant="secondary">
                          Add
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="text-sm font-semibold text-ink">Follow-ups</h2>
              {tasks.length > 0 ? (
                <ul className="mt-2 divide-y divide-slate-100">
                  {tasks.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <div className="min-w-0">
                        <p
                          className={`truncate text-sm ${t.done_at ? "text-slate-400 line-through" : "text-slate-700"}`}
                        >
                          {t.title}
                        </p>
                        {t.due_on ? (
                          <p className="text-xs text-slate-400">{t.due_on}</p>
                        ) : null}
                      </div>
                      {!t.done_at ? (
                        <form action={completeTask}>
                          <input type="hidden" name="task_id" value={t.id} />
                          <input
                            type="hidden"
                            name="back_to"
                            value={`/dashboard/crm/${contact.id}`}
                          />
                          <Button type="submit" size="sm" variant="secondary">
                            Done
                          </Button>
                        </form>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No follow-ups yet.</p>
              )}
              <form action={addTask} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="contact_id" value={contact.id} />
                <div className="min-w-56 flex-1">
                  <Field label="New follow-up" htmlFor="t_title">
                    <Input
                      id="t_title"
                      name="title"
                      maxLength={200}
                      placeholder="e.g. Send floor plans for the Rose"
                    />
                  </Field>
                </div>
                <div className="min-w-36">
                  <Field label="Due" htmlFor="t_due">
                    <Input id="t_due" name="due_on" type="date" />
                  </Field>
                </div>
                <Button type="submit" variant="secondary">
                  Add
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <h2 className="text-sm font-semibold text-ink">Details</h2>
              <form action={updateContact} className="mt-3 space-y-3">
                <input type="hidden" name="contact_id" value={contact.id} />
                <Field label="Name" htmlFor="e_name">
                  <Input id="e_name" name="name" defaultValue={contact.name} required maxLength={120} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Email" htmlFor="e_email">
                    <Input id="e_email" name="email" type="email" defaultValue={contact.email ?? ""} maxLength={320} />
                  </Field>
                  <Field label="Phone" htmlFor="e_phone">
                    <Input id="e_phone" name="phone" defaultValue={contact.phone ?? ""} maxLength={40} />
                  </Field>
                </div>
                <Field label="Type" htmlFor="e_kind">
                  <Select id="e_kind" name="contact_kind" defaultValue={contact.contact_kind ?? "buyer"}>
                    {KINDS.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Notes" htmlFor="e_notes">
                  <Textarea id="e_notes" name="notes" defaultValue={contact.notes ?? ""} maxLength={4000} />
                </Field>
                <label className="flex items-start gap-2 text-xs text-slate-500">
                  <Checkbox
                    name="consent_email"
                    defaultChecked={contact.consent_email}
                    className="mt-0.5"
                  />
                  <span>
                    Email consent (CASL) — I attest this person consented to
                    commercial emails from me.
                    {contact.consent_attested_at
                      ? ` Attested ${new Date(contact.consent_attested_at).toLocaleDateString("en-CA")}.`
                      : ""}
                  </span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  <Checkbox name="archived" defaultChecked={contact.archived} />
                  Archive this contact
                </label>
                <Button type="submit">Save</Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="text-sm font-semibold text-ink">History</h2>
              {activities.length > 0 ? (
                <ul className="mt-2 divide-y divide-slate-100">
                  {activities.map((a) => (
                    <li key={a.id} className="py-2">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium capitalize">{a.kind}</span>
                        {a.outcome ? ` — ${a.outcome}` : ""}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(a.created_at).toLocaleString("en-CA")}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  No logged touches yet.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
