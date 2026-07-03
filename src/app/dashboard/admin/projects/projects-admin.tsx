"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Select, Checkbox } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { RECORD_STATUS } from "@/lib/status";
import type { RecordStatus } from "@/lib/status";
import { bulkSetProjectStatus, bulkPublish, bulkUnpublish } from "./actions";

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
  { value: "publish", label: "Publish" },
  { value: "unpublish", label: "Unpublish" },
];

export function ProjectsAdmin({
  rows,
  searching,
}: {
  rows: AdminProjectRow[];
  searching?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
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
    const count = selected.size;
    const label =
      BULK_OPTIONS.find((o) => o.value === status)?.label ?? status;
    const fd = new FormData();
    selected.forEach((id) => fd.append("ids", id));
    try {
      if (status === "publish") {
        await bulkPublish(fd);
      } else if (status === "unpublish") {
        await bulkUnpublish(fd);
      } else {
        fd.set("status", status);
        await bulkSetProjectStatus(fd);
      }
      toast(
        `${label} applied to ${count} project${count === 1 ? "" : "s"}.`,
      );
      setSelected(new Set());
    } catch {
      toast(`Couldn't apply "${label}" — try again.`, "error");
    }
    setBusy(false);
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardBody className="text-center text-sm text-slate-500">
          {searching
            ? "No projects match your search."
            : "No projects yet. Approve a submission to create the first canonical project."}
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <Checkbox checked={allSelected} onChange={toggleAll} />
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
            <ConfirmButton
              type="button"
              size="sm"
              disabled={busy || selected.size === 0}
              title="Apply bulk action"
              message={`${
                BULK_OPTIONS.find((o) => o.value === status)?.label ?? status
              } ${selected.size} selected project${
                selected.size === 1 ? "" : "s"
              }? ${
                status === "unpublish" || status === "archived"
                  ? "This pulls them off the public site immediately."
                  : status === "publish"
                    ? "This puts them on the public site immediately."
                    : "You can change status again at any time."
              }`}
              confirmLabel={busy ? "Applying…" : "Yes, apply"}
              onConfirm={apply}
            >
              {busy ? "Applying…" : "Apply"}
            </ConfirmButton>
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
              <Checkbox
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
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
