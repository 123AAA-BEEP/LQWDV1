import type { Metadata } from "next";
import {
  ExternalLink,
  Eye,
  FolderHeart,
  Plus,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUserProfile, isApproved } from "@/lib/auth";
import { daysAgoIso } from "@/lib/dates";
import { Card, CardBody } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { CopyField } from "@/components/ui/copy-field";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { VerificationRequired } from "@/components/dashboard/locked";
import {
  createCollection,
  addCollectionItem,
  removeCollectionItem,
  setCollectionRevoked,
  deleteCollection,
  saveProjectDetails,
  removeMaterial,
} from "./actions";
import { MaterialUpload } from "./material-upload";

export const metadata: Metadata = { title: "Shortlists" };
export const dynamic = "force-dynamic";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca"
).replace(/\/+$/, "");

const MESSAGES: Record<string, string> = {
  created: "Shortlist created — add projects below, then send your client the link.",
  added: "Project added.",
  removed: "Removed.",
  revoked: "Link revoked — the page no longer loads for anyone.",
  restored: "Link restored.",
  deleted: "Shortlist deleted.",
  "details-saved": "Details saved — they'll show in every shortlist with this project.",
  "file-added": "File attached.",
  "file-removed": "File removed.",
};

interface CollectionRow {
  id: string;
  token: string;
  title: string;
  note: string | null;
  created_at: string;
  revoked_at: string | null;
}

interface ItemRow {
  id: string;
  project_id: string;
  projects: { project_name: string; city: string | null } | null;
}

interface NotesRow {
  incentive_note: string | null;
  deposit_note: string | null;
  extra_note: string | null;
}

interface FileRow {
  id: string;
  title: string;
  document_type: string | null;
  uploaded_by_user_id: string | null;
}

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    c?: string;
    q?: string;
    item?: string;
    message?: string;
    error?: string;
  }>;
}) {
  const { profile } = await requireUserProfile();
  const { c, q, item, message, error } = await searchParams;

  if (profile.role !== "realtor") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Shortlists
        </h1>
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            Shortlists are for realtor accounts.
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!isApproved(profile)) {
    return (
      <div className="space-y-6">
        <Header />
        <VerificationRequired />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: collData } = await supabase
    .from("client_collections")
    .select("id, token, title, note, created_at, revoked_at")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });
  const collections = (collData ?? []) as CollectionRow[];
  const selected = collections.find((x) => x.id === c) ?? null;

  // Views per collection (last 30 days) — the proof-it-works number.
  const { data: visitData } = await supabase
    .from("link_visits")
    .select("collection_id")
    .eq("profile_id", profile.id)
    .eq("source", "collection")
    .gte("created_at", daysAgoIso(30));
  const viewsByCollection = new Map<string, number>();
  for (const v of (visitData ?? []) as { collection_id: string | null }[]) {
    if (!v.collection_id) continue;
    viewsByCollection.set(
      v.collection_id,
      (viewsByCollection.get(v.collection_id) ?? 0) + 1,
    );
  }

  // Selected collection's items + project search for the picker.
  let items: ItemRow[] = [];
  let results: { project_id: string; project_name: string; city: string | null }[] = [];
  let detailNotes: NotesRow | null = null;
  let detailFiles: FileRow[] = [];
  const query = (q ?? "").trim();
  if (selected) {
    const { data: itemData } = await supabase
      .from("client_collection_items")
      .select("id, project_id, projects(project_name, city)")
      .eq("collection_id", selected.id)
      .order("sort_order", { ascending: true });
    items = (itemData ?? []) as unknown as ItemRow[];

    // Details panel for one project. Notes are the agent's own; files are
    // PROJECT-level community materials (any approved agent's rights-confirmed
    // uploads — one agent uploads The Summit's floor plans, everyone benefits).
    if (item && items.some((i) => i.project_id === item)) {
      const [{ data: notes }, { data: files }] = await Promise.all([
        supabase
          .from("agent_project_notes")
          .select("incentive_note, deposit_note, extra_note")
          .eq("profile_id", profile.id)
          .eq("project_id", item)
          .maybeSingle(),
        supabase
          .from("shared_project_materials")
          .select("id, title, document_type, uploaded_by_user_id")
          .eq("project_id", item)
          .order("created_at", { ascending: true }),
      ]);
      detailNotes = (notes as NotesRow) ?? null;
      detailFiles = (files ?? []) as FileRow[];
    }

    if (query) {
      const { data } = await supabase
        .from("public_projects_view")
        .select("project_id, project_name, city")
        .or(`project_name.ilike.%${query}%,city.ilike.%${query}%`)
        .limit(8);
      const have = new Set(items.map((i) => i.project_id));
      results = ((data ?? []) as typeof results).filter(
        (r) => !have.has(r.project_id),
      );
    }
  }

  return (
    <div className="space-y-6">
      <Header />

      {message ? <Notice tone="success">{MESSAGES[message] ?? "Saved."}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      {/* Create */}
      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink">New shortlist</h2>
          <form action={createCollection} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Name"
                htmlFor="coll_title"
                hint="Your client sees this as the page title."
              >
                <Input
                  id="coll_title"
                  name="title"
                  placeholder="e.g. Projects for the Smiths"
                  required
                  maxLength={120}
                />
              </Field>
              <Field label="Note to your client (optional)" htmlFor="coll_note">
                <Textarea
                  id="coll_note"
                  name="note"
                  rows={2}
                  placeholder="e.g. Here are the five I'd shortlist for you — call me with questions."
                />
              </Field>
            </div>
            <Button type="submit" variant="secondary">
              <Plus aria-hidden className="mr-1 size-4" /> Create shortlist
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* List */}
      {collections.length > 0 ? (
        <div className="space-y-3">
          {collections.map((coll) => {
            const url = `${SITE_URL}/c/${coll.token}`;
            const active = selected?.id === coll.id;
            const views = viewsByCollection.get(coll.id) ?? 0;
            return (
              <Card
                key={coll.id}
                className={active ? "border-brand-300 ring-1 ring-brand-200" : undefined}
              >
                <CardBody>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">
                        {coll.title}
                        {coll.revoked_at ? (
                          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                            Revoked
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        <Eye aria-hidden className="mr-1 inline size-3.5 align-[-2px]" />
                        {views} view{views === 1 ? "" : "s"} in 30 days
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!coll.revoked_at ? (
                        <ButtonLink
                          href={`/c/${coll.token}`}
                          variant="secondary"
                          size="sm"
                          target="_blank"
                        >
                          <ExternalLink aria-hidden className="mr-1 size-3.5" /> Preview
                        </ButtonLink>
                      ) : null}
                      <ButtonLink
                        href={`/dashboard/shortlists?c=${coll.id}`}
                        variant="secondary"
                        size="sm"
                      >
                        Manage
                      </ButtonLink>
                    </div>
                  </div>
                  {!coll.revoked_at ? (
                    <div className="mt-3">
                      <CopyField value={url} size="sm" copyLabel="Copy link" />
                    </div>
                  ) : null}

                  {active ? (
                    <div className="mt-5 border-t border-slate-100 pt-4">
                      {items.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          No projects yet — search below to add your shortlist.
                        </p>
                      ) : (
                        <ul className="divide-y divide-slate-100">
                          {items.map((it) => (
                            <li key={it.id} className="py-2.5">
                              <div className="flex items-center justify-between gap-3">
                                <span className="min-w-0 truncate text-sm text-slate-700">
                                  {it.projects?.project_name ?? "Project"}
                                  {it.projects?.city ? (
                                    <span className="text-slate-400"> · {it.projects.city}</span>
                                  ) : null}
                                </span>
                                <div className="flex shrink-0 items-center gap-1.5">
                                  <ButtonLink
                                    href={
                                      item === it.project_id
                                        ? `/dashboard/shortlists?c=${coll.id}`
                                        : `/dashboard/shortlists?c=${coll.id}&item=${it.project_id}`
                                    }
                                    variant="secondary"
                                    size="sm"
                                  >
                                    {item === it.project_id ? "Close" : "Details"}
                                  </ButtonLink>
                                  <form action={removeCollectionItem}>
                                    <input type="hidden" name="item_id" value={it.id} />
                                    <input type="hidden" name="collection_id" value={coll.id} />
                                    <button
                                      type="submit"
                                      className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                      aria-label="Remove from shortlist"
                                    >
                                      <Trash2 aria-hidden className="size-4" />
                                    </button>
                                  </form>
                                </div>
                              </div>

                              {/* Agent-supplied depth — floor plans, incentives, deposit */}
                              {item === it.project_id ? (
                                <div className="mt-3 space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                                  <p className="text-xs text-slate-500">
                                    What you add here shows in{" "}
                                    <span className="font-medium text-slate-600">
                                      every shortlist you share
                                    </span>{" "}
                                    that includes this project.
                                  </p>
                                  <form action={saveProjectDetails} className="space-y-3">
                                    <input type="hidden" name="collection_id" value={coll.id} />
                                    <input type="hidden" name="project_id" value={it.project_id} />
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <Field
                                        label="Current incentive"
                                        htmlFor={`inc-${it.id}`}
                                      >
                                        <Input
                                          id={`inc-${it.id}`}
                                          name="incentive_note"
                                          maxLength={500}
                                          placeholder="e.g. $20K décor credit until Aug 31"
                                          defaultValue={detailNotes?.incentive_note ?? ""}
                                        />
                                      </Field>
                                      <Field
                                        label="Deposit structure"
                                        htmlFor={`dep-${it.id}`}
                                      >
                                        <Input
                                          id={`dep-${it.id}`}
                                          name="deposit_note"
                                          maxLength={500}
                                          placeholder="e.g. 5% on signing, 5% in 90 days"
                                          defaultValue={detailNotes?.deposit_note ?? ""}
                                        />
                                      </Field>
                                    </div>
                                    <Field label="Note for your client" htmlFor={`note-${it.id}`}>
                                      <Textarea
                                        id={`note-${it.id}`}
                                        name="extra_note"
                                        rows={2}
                                        maxLength={1000}
                                        placeholder="e.g. Corner units on floors 8-14 still available."
                                        defaultValue={detailNotes?.extra_note ?? ""}
                                      />
                                    </Field>
                                    <Button type="submit" variant="secondary" size="sm">
                                      Save details
                                    </Button>
                                  </form>

                                  <div className="border-t border-slate-200 pt-3">
                                    <p className="text-sm font-medium text-slate-700">
                                      Project materials ({detailFiles.length})
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                      Floor plans and brochures live with the
                                      project — every LIQWD agent can use them,
                                      and they show on any shortlist with this
                                      project. You can add up to 10 of your own.
                                    </p>
                                    {detailFiles.length > 0 ? (
                                      <ul className="mt-2 divide-y divide-slate-100">
                                        {detailFiles.map((f) => (
                                          <li
                                            key={f.id}
                                            className="flex items-center justify-between gap-3 py-1.5"
                                          >
                                            <span className="min-w-0 truncate text-sm text-slate-600">
                                              {f.title}
                                              <span className="ml-2 text-xs text-slate-400">
                                                {f.uploaded_by_user_id === profile.id
                                                  ? "added by you"
                                                  : "added by another agent"}
                                              </span>
                                            </span>
                                            {f.uploaded_by_user_id === profile.id ? (
                                              <form action={removeMaterial}>
                                                <input type="hidden" name="file_id" value={f.id} />
                                                <input type="hidden" name="collection_id" value={coll.id} />
                                                <input type="hidden" name="project_id" value={it.project_id} />
                                                <button
                                                  type="submit"
                                                  className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                                  aria-label="Remove file"
                                                >
                                                  <Trash2 aria-hidden className="size-3.5" />
                                                </button>
                                              </form>
                                            ) : null}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : null}
                                    <div className="mt-3">
                                      <MaterialUpload
                                        projectId={it.project_id}
                                        userId={profile.id}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}

                      <form method="get" className="mt-3 flex gap-2">
                        <input type="hidden" name="c" value={coll.id} />
                        <Input
                          name="q"
                          placeholder="Search projects by name or city…"
                          defaultValue={query}
                        />
                        <Button type="submit" variant="secondary">
                          Search
                        </Button>
                      </form>
                      {query && results.length === 0 ? (
                        <p className="mt-3 text-sm text-slate-500">
                          No published projects match “{query}”.
                        </p>
                      ) : null}
                      {results.length > 0 ? (
                        <ul className="mt-3 divide-y divide-slate-100">
                          {results.map((r) => (
                            <li
                              key={r.project_id}
                              className="flex items-center justify-between gap-3 py-2.5"
                            >
                              <span className="min-w-0 truncate text-sm text-slate-700">
                                {r.project_name}
                                {r.city ? (
                                  <span className="text-slate-400"> · {r.city}</span>
                                ) : null}
                              </span>
                              <form action={addCollectionItem}>
                                <input type="hidden" name="collection_id" value={coll.id} />
                                <input type="hidden" name="project_id" value={r.project_id} />
                                <Button type="submit" variant="secondary" size="sm">
                                  <Plus aria-hidden className="mr-1 size-4" /> Add
                                </Button>
                              </form>
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                        <form action={setCollectionRevoked}>
                          <input type="hidden" name="collection_id" value={coll.id} />
                          <input
                            type="hidden"
                            name="revoke"
                            value={coll.revoked_at ? "0" : "1"}
                          />
                          <Button type="submit" variant="secondary" size="sm">
                            {coll.revoked_at ? (
                              <>
                                <RotateCcw aria-hidden className="mr-1 size-3.5" /> Restore link
                              </>
                            ) : (
                              <>
                                <XCircle aria-hidden className="mr-1 size-3.5" /> Revoke link
                              </>
                            )}
                          </Button>
                        </form>
                        <form action={deleteCollection}>
                          <input type="hidden" name="collection_id" value={coll.id} />
                          <Button type="submit" variant="secondary" size="sm">
                            <Trash2 aria-hidden className="mr-1 size-3.5" /> Delete
                          </Button>
                        </form>
                      </div>
                    </div>
                  ) : null}
                </CardBody>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            No shortlists yet. Create one above — it replaces the list of
            links you&apos;d otherwise paste into an email, and every inquiry
            from it routes to you.
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
        <FolderHeart aria-hidden className="size-6 text-brand-600" /> Shortlists
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Curate a shortlist for a specific client and send one link. Your name
        and photo sit on top, and every inquiry from the page is attributed to
        you — even if it gets forwarded around the family.
      </p>
    </div>
  );
}
