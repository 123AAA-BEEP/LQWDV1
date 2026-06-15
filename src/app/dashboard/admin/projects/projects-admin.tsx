"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { RECORD_STATUS } from "@/lib/status";
import type { RecordStatus } from "@/lib/status";
import { bulkSetProjectStatus } from "./actions";

export interface AdminProjectRow {
  id: string;
  slug: string;
  project_name: string;
  city: string | null;
  record_status: RecordStatus;
  live: boolean;
}

const BULK_OPTIONS: { value: string; label: string }[] = [
  { value: "approved", label: "Approve" },
  { value: "draft", label: "Set to Draft" },
  { value: "archived", label: "Archive" },
];

export function ProjectsAdmin({ rows }: { rows: AdminProjectRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState("approved");
  const [busy, setBusy] = useState(false);

  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  async function apply() {
    if (selected.size === 0) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("status", status);
    selected.forEach((id) => fd.append("ids", id));
    await bulkSetProjectStatus(fd);
    setSelected(new Set());
    setBusy(false);
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardBody className="text-center text-sm text-slate-500">
          No projects yet. Approve a submission to create the first canonical
          project.
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="size-4 rounded border-slate-300"
            />
            Select all ({rows.length})
          </label>
          <span className="text-sm text-slate-400">
            {selected.size} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-auto"
            >
              {BULK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              size="sm"
              onClick={apply}
              disabled={busy || selected.size === 0}
            >
              {busy ? "Applying…" : "Apply"}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="divide-y divide-slate-100 p-0">
          {rows.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
                className="size-4 shrink-0 rounded border-slate-300"
                aria-label={`Select ${p.project_name}`}
              />
              <Link
                href={`/dashboard/admin/projects/${p.id}`}
                className="flex min-w-0 flex-1 items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">
                    {p.project_name}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {p.city ?? "—"} · /{p.slug}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {p.live ? (
                    <Badge tone="success">Live</Badge>
                  ) : (
                    <Badge tone="neutral">Not public</Badge>
                  )}
                  <Badge tone={RECORD_STATUS[p.record_status].tone}>
                    {RECORD_STATUS[p.record_status].label}
                  </Badge>
                </div>
              </Link>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
