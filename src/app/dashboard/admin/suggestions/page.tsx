import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import {
  SUGGESTION_STATUS,
  SUGGESTION_CATEGORY_LABELS,
  type SuggestionStatus,
} from "@/lib/status";
import { setSuggestionStatus } from "./actions";

export const metadata: Metadata = { title: "Suggestions" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  category: string;
  title: string;
  body: string | null;
  status: SuggestionStatus;
  open_to_collaborate: boolean;
  contact_ok: boolean;
  public_response: string | null;
  admin_notes: string | null;
  created_at: string;
  submitter: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

const OPEN_STATUSES = ["new", "under_review", "planned", "in_progress"];
const DECIDED_STATUSES = ["shipped", "declined"];
const STATUS_OPTIONS = Object.keys(SUGGESTION_STATUS) as SuggestionStatus[];

function submitterName(r: Row): string {
  return (
    [r.submitter?.first_name, r.submitter?.last_name]
      .filter(Boolean)
      .join(" ") ||
    r.submitter?.email ||
    "unknown"
  );
}

export default async function SuggestionsQueue() {
  const supabase = await createClient();
  const select =
    "id, category, title, body, status, open_to_collaborate, contact_ok, public_response, admin_notes, created_at, submitter:profiles!submitted_by_profile_id(first_name,last_name,email)";

  const [{ data: open }, { data: decided }] = await Promise.all([
    supabase
      .from("platform_suggestions")
      .select(select)
      .in("status", OPEN_STATUSES)
      .order("created_at", { ascending: true }),
    supabase
      .from("platform_suggestions")
      .select(select)
      .in("status", DECIDED_STATUSES)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const openRows = (open as unknown as Row[]) ?? [];
  const decidedRows = (decided as unknown as Row[]) ?? [];

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Open ideas ({openRows.length})
        </h2>
        {openRows.length === 0 ? (
          <Card>
            <CardBody className="text-center text-sm text-slate-500">
              No open suggestions right now.
            </CardBody>
          </Card>
        ) : (
          openRows.map((r) => (
            <Card key={r.id}>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800">{r.title}</p>
                    <p className="text-xs text-slate-400">
                      {SUGGESTION_CATEGORY_LABELS[r.category] ?? r.category} ·
                      submitted by {submitterName(r)} ·{" "}
                      {new Date(r.created_at).toLocaleDateString("en-CA")}
                    </p>
                  </div>
                  <Badge tone={SUGGESTION_STATUS[r.status].tone}>
                    {SUGGESTION_STATUS[r.status].label}
                  </Badge>
                </div>

                {r.body ? (
                  <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    {r.body}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {r.open_to_collaborate ? (
                    <Badge tone="brand">Open to collaborate</Badge>
                  ) : null}
                  <Badge tone={r.contact_ok ? "success" : "neutral"}>
                    {r.contact_ok ? "OK to contact" : "No contact"}
                  </Badge>
                </div>

                <form
                  action={setSuggestionStatus}
                  className="space-y-3 border-t border-slate-100 pt-3"
                >
                  <input type="hidden" name="suggestion_id" value={r.id} />
                  <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
                    <Field label="Status" htmlFor={`status-${r.id}`}>
                      <Select
                        id={`status-${r.id}`}
                        name="status"
                        defaultValue={r.status}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {SUGGESTION_STATUS[s].label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field
                      label="Public response"
                      htmlFor={`response-${r.id}`}
                      hint="Shown back to the realtor who submitted this."
                    >
                      <Textarea
                        id={`response-${r.id}`}
                        name="public_response"
                        defaultValue={r.public_response ?? ""}
                        placeholder="Optional reply to the submitter…"
                      />
                    </Field>
                  </div>
                  <Field
                    label="Internal notes"
                    htmlFor={`notes-${r.id}`}
                    hint="Admin-only; not shown to the realtor."
                  >
                    <Textarea
                      id={`notes-${r.id}`}
                      name="admin_notes"
                      defaultValue={r.admin_notes ?? ""}
                    />
                  </Field>
                  <Button type="submit" size="sm">
                    Save
                  </Button>
                </form>
              </CardBody>
            </Card>
          ))
        )}
      </section>

      {decidedRows.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Recently decided
          </h2>
          <Card>
            <CardBody className="divide-y divide-slate-100 p-0">
              {decidedRows.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {r.title}
                    </p>
                    {r.public_response ? (
                      <p className="truncate text-xs text-slate-400">
                        {r.public_response}
                      </p>
                    ) : null}
                  </div>
                  <Badge tone={SUGGESTION_STATUS[r.status].tone}>
                    {SUGGESTION_STATUS[r.status].label}
                  </Badge>
                </div>
              ))}
            </CardBody>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
