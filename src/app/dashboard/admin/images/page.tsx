import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { imageSearchConfigured } from "@/lib/images";
import {
  sourceImagesBatch,
  approveCandidate,
  rejectCandidate,
  addManualImage,
} from "./actions";

export const metadata: Metadata = { title: "Images" };
export const dynamic = "force-dynamic";

interface Candidate {
  id: string;
  project_id: string;
  image_url: string;
  source_url: string | null;
  source_title: string | null;
  rank: number;
  project: {
    project_name: string;
    city: string | null;
    slug: string;
    hero_image_url: string | null;
  } | null;
}

export default async function AdminImagesPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { message, error } = await searchParams;
  const supabase = await createClient();
  const configured = imageSearchConfigured();

  const [{ count: missingHero }, { count: pendingCount }, { data: pending }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .or("hero_image_url.is.null,hero_image_url.eq."),
      supabase
        .from("project_media_candidates")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("project_media_candidates")
        .select(
          "id, project_id, image_url, source_url, source_title, rank, project:projects!project_id(project_name, city, slug, hero_image_url)",
        )
        .eq("status", "pending")
        .order("project_id", { ascending: true })
        .order("rank", { ascending: true })
        .limit(300),
    ]);

  const candidates = (pending as unknown as Candidate[]) ?? [];

  // Group candidates by project, preserving order.
  const groups: { projectId: string; project: Candidate["project"]; items: Candidate[] }[] = [];
  const byId = new Map<string, number>();
  for (const c of candidates) {
    let idx = byId.get(c.project_id);
    if (idx === undefined) {
      idx = groups.length;
      byId.set(c.project_id, idx);
      groups.push({ projectId: c.project_id, project: c.project, items: [] });
    }
    groups[idx].items.push(c);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Project images
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Source hero images for projects, then approve one per project. Approval
          downloads the image into the public media bucket and sets the hero —
          nothing goes live until you approve it.
        </p>
      </div>

      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      {!configured ? (
        <Notice tone="warning">
          Image search isn’t configured. Add <code>GOOGLE_CSE_KEY</code> and{" "}
          <code>GOOGLE_CSE_CX</code> to the deployment environment to enable
          automatic sourcing. You can still attach images by URL below.
        </Notice>
      ) : null}

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-ink">{missingHero ?? 0}</span>{" "}
            projects without a hero ·{" "}
            <span className="font-semibold text-ink">{pendingCount ?? 0}</span>{" "}
            candidates awaiting review
          </div>
          <form action={sourceImagesBatch} className="flex items-center gap-2">
            <input type="hidden" name="batch" value="10" />
            <SubmitButton pendingLabel="Searching…" size="sm">
              Find images for next 10
            </SubmitButton>
          </form>
        </CardBody>
      </Card>

      {groups.length === 0 ? (
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            No candidates awaiting review.{" "}
            {configured
              ? "Click “Find images for next 10” to source more."
              : "Configure image search, or attach images by URL from a project."}
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <Card key={g.projectId}>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800">
                      {g.project?.project_name ?? "Project"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {g.project?.city ?? "—"}
                      {g.project?.slug ? (
                        <>
                          {" · "}
                          <Link
                            href={`/dashboard/admin/projects/${g.projectId}`}
                            className="text-brand-700 hover:underline"
                          >
                            Open project →
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {g.items.map((c) => (
                    <div
                      key={c.id}
                      className="overflow-hidden rounded-lg border border-slate-200"
                    >
                      <div className="aspect-video bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={c.image_url}
                          alt={c.source_title ?? "Candidate image"}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="space-y-2 p-2">
                        {c.source_url ? (
                          <a
                            href={c.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-xs text-slate-400 hover:underline"
                            title={c.source_url}
                          >
                            {c.source_title ?? c.source_url}
                          </a>
                        ) : null}
                        <div className="flex gap-2">
                          <form action={approveCandidate} className="flex-1">
                            <input type="hidden" name="candidate_id" value={c.id} />
                            <Button type="submit" size="sm" className="w-full">
                              Approve
                            </Button>
                          </form>
                          <form action={rejectCandidate}>
                            <input type="hidden" name="candidate_id" value={c.id} />
                            <Button type="submit" size="sm" variant="ghost">
                              Reject
                            </Button>
                          </form>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <form
                  action={addManualImage}
                  className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3"
                >
                  <input type="hidden" name="project_id" value={g.projectId} />
                  <Input
                    name="image_url"
                    type="url"
                    placeholder="Paste an image URL to use instead…"
                    className="min-w-56 flex-1"
                  />
                  <Button type="submit" size="sm" variant="secondary">
                    Add by URL
                  </Button>
                </form>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
