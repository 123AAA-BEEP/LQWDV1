import type { Metadata } from "next";
import Link from "next/link";
import { requireUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Checkbox } from "@/components/ui/field";
import { FlashNotice } from "@/components/ui/flash-notice";
import { createContact, completeTask } from "./actions";

export const metadata: Metadata = { title: "Clients" };
export const dynamic = "force-dynamic";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  contact_kind: string | null;
  consent_email: boolean;
  archived: boolean;
  updated_at: string;
}
interface Task {
  id: string;
  contact_id: string | null;
  title: string;
  due_on: string | null;
}

const KIND_LABEL: Record<string, string> = {
  buyer: "Buyer",
  investor: "Investor",
  seller: "Seller",
  renter: "Renter",
  past_client: "Past client",
  other: "Contact",
};

const first = (v: unknown): string =>
  Array.isArray(v) ? String(v[0] ?? "") : typeof v === "string" ? v : "";

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = first(sp.q).trim();
  const { profile } = await requireUserProfile();
  const supabase = await createClient();

  let contactsReq = supabase
    .from("crm_contacts")
    .select("id, name, email, phone, contact_kind, consent_email, archived, updated_at")
    .eq("agent_profile_id", profile.id)
    .eq("archived", false)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (q) {
    contactsReq = contactsReq.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const [{ data: contactData }, { data: taskData }] = await Promise.all([
    contactsReq,
    supabase
      .from("crm_tasks")
      .select("id, contact_id, title, due_on")
      .eq("agent_profile_id", profile.id)
      .is("done_at", null)
      .not("due_on", "is", null)
      .lte("due_on", today)
      .order("due_on")
      .limit(20),
  ]);
  const contacts = (contactData as Contact[] | null) ?? [];
  const dueTasks = (taskData as Task[] | null) ?? [];
  const consented = contacts.filter((c) => c.consent_email).length;

  return (
    <div className="space-y-6">
      <FlashNotice
        searchParams={{ flash: first(sp.flash), flash_tone: first(sp.flash_tone) }}
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Clients
          </h1>
          <p className="mt-1 text-slate-500">
            Your book, in one place — contacts, the projects they care about,
            and your follow-ups. {consented > 0 ? (
              <>
                {consented} contact{consented === 1 ? "" : "s"} can receive
                your{" "}
                <Link href="/dashboard/newsletter" className="text-brand-700 hover:underline">
                  newsletter
                </Link>
                .
              </>
            ) : (
              <>
                Tick email consent on contacts to unlock your{" "}
                <Link href="/dashboard/newsletter" className="text-brand-700 hover:underline">
                  newsletter
                </Link>
                .
              </>
            )}
          </p>
        </div>
      </div>

      {dueTasks.length > 0 ? (
        <Card>
          <CardBody>
            <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-amber-700">
              Due now ({dueTasks.length})
            </h2>
            <ul className="mt-2 divide-y divide-slate-100">
              {dueTasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-700">{t.title}</p>
                    <p className="text-xs text-slate-400">
                      {t.due_on}
                      {t.contact_id ? (
                        <>
                          {" · "}
                          <Link
                            href={`/dashboard/crm/${t.contact_id}`}
                            className="text-brand-700 hover:underline"
                          >
                            open contact
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <form action={completeTask}>
                    <input type="hidden" name="task_id" value={t.id} />
                    <input type="hidden" name="back_to" value="/dashboard/crm" />
                    <Button type="submit" size="sm" variant="secondary">
                      Done
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink">Add a contact</h2>
          <form action={createContact} className="mt-3 flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1">
              <Field label="Name" htmlFor="c_name">
                <Input id="c_name" name="name" required maxLength={120} />
              </Field>
            </div>
            <div className="min-w-56 flex-1">
              <Field label="Email" htmlFor="c_email">
                <Input id="c_email" name="email" type="email" maxLength={320} />
              </Field>
            </div>
            <div className="min-w-40">
              <Field label="Phone" htmlFor="c_phone">
                <Input id="c_phone" name="phone" maxLength={40} />
              </Field>
            </div>
            <div className="min-w-36">
              <Field label="Type" htmlFor="c_kind">
                <Select id="c_kind" name="contact_kind" defaultValue="buyer">
                  {Object.entries(KIND_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button type="submit">Add</Button>
            <label className="flex w-full items-start gap-2 text-xs text-slate-500">
              <Checkbox name="consent_email" className="mt-0.5" />
              <span>
                This person gave me consent (express, or an existing business
                relationship under CASL) to receive commercial emails — allows
                newsletter sends. You attest to this; unsubscribes are honoured
                instantly and permanently.
              </span>
            </label>
          </form>
        </CardBody>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <form method="get" className="flex flex-1 items-center gap-2">
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search your contacts…"
            className="max-w-xs"
          />
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
        <p className="text-sm text-slate-400">
          {contacts.length} contact{contacts.length === 1 ? "" : "s"}
        </p>
      </div>

      {contacts.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center text-sm text-slate-500">
            {q ? (
              <>No contacts match &ldquo;{q}&rdquo;.</>
            ) : (
              <>
                No contacts yet. Add your first above — or save assigned leads
                from your{" "}
                <Link href="/dashboard/leads" className="text-brand-700 hover:underline">
                  Leads inbox
                </Link>{" "}
                with one click.
              </>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <Card key={c.id}>
              <CardBody className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/crm/${c.id}`}
                    className="font-medium text-ink hover:text-brand-700"
                  >
                    {c.name}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {[c.email, c.phone].filter(Boolean).join(" · ") || "no contact info"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {c.consent_email ? (
                    <Badge tone="success">Newsletter ✓</Badge>
                  ) : null}
                  <Badge tone="neutral">
                    {KIND_LABEL[c.contact_kind ?? "other"] ?? "Contact"}
                  </Badge>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
