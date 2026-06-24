"""Supabase access with hard write-guards baked in.

The pipeline reads `projects` and writes ONLY to staging tables +
`project_media_candidates`. The guards here make the non-negotiable
constraints structural rather than a matter of remembering them:

  * never UPDATE a project whose record_status is published/approved   (#1)
  * never write `projects` content fields                              (#2)
  * the only `projects` writes permitted are last_verified_at /
    import_notes run-markers, on draft rows only

This module is import-safe without the supabase package installed; the client
is created lazily so offline/dry-run paths (e.g. Stage 0 from a JSON fixture)
need no dependencies.
"""

from __future__ import annotations

from typing import Any

from .config import Settings

# Columns the pipeline is ever allowed to touch on `projects` (NOT content).
_ALLOWED_PROJECT_WRITE_COLS = {"last_verified_at", "import_notes"}
_LOCKED_STATUSES = {"published", "approved"}

# Fields selected for Stage 0 / base record reads.
PROJECT_READ_COLS = (
    "id, slug, project_name, builder_name, builder_names_raw, address_full, "
    "city, municipality, sales_status, construction_status, record_status, "
    "price_from_public, price_to_public, size_range_sqft_min, "
    "size_range_sqft_max, storeys, total_units, hero_image_url, website_url"
)


class GuardViolation(RuntimeError):
    """Raised when a caller attempts a write the constraints forbid."""


class Db:
    def __init__(self, settings: Settings):
        if not settings.has_supabase:
            raise GuardViolation(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use the DB."
            )
        from supabase import create_client  # imported lazily

        self._client = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )

    # ---- reads -----------------------------------------------------------
    def fetch_projects_for_city(self, city: str) -> list[dict[str, Any]]:
        res = (
            self._client.table("projects")
            .select(PROJECT_READ_COLS)
            .or_(f"city.ilike.{city},municipality.ilike.{city}")
            .order("project_name")
            .execute()
        )
        return res.data or []

    def fetch_project(self, project_id: str) -> dict[str, Any] | None:
        res = (
            self._client.table("projects")
            .select(PROJECT_READ_COLS)
            .eq("id", project_id)
            .limit(1)
            .execute()
        )
        return (res.data or [None])[0]

    # ---- guarded writes --------------------------------------------------
    def mark_project_verified(self, project: dict[str, Any], note: str) -> None:
        """Append a run marker + set last_verified_at — DRAFT rows only."""
        if project.get("record_status") in _LOCKED_STATUSES:
            raise GuardViolation(
                f"Refusing to write locked project {project.get('id')} "
                f"(record_status={project.get('record_status')})."
            )
        existing = project.get("import_notes") or ""
        payload = {
            "last_verified_at": "now()",
            "import_notes": (existing + ("\n" if existing else "") + note).strip(),
        }
        assert set(payload).issubset(_ALLOWED_PROJECT_WRITE_COLS)  # belt + braces
        (
            self._client.table("projects")
            .update(payload)
            .eq("id", project["id"])
            .eq("record_status", "draft")  # DB-side guard too
            .execute()
        )

    def insert_run(self, target_city: str, mode: str, params: dict[str, Any]) -> str:
        res = (
            self._client.table("enrichment_runs")
            .insert({"target_city": target_city, "mode": mode, "params": params})
            .execute()
        )
        return res.data[0]["id"]

    def finish_run(self, run_id: str, summary: dict[str, Any], status: str = "finished") -> None:
        (
            self._client.table("enrichment_runs")
            .update({"finished_at": "now()", "summary": summary, "status": status})
            .eq("id", run_id)
            .execute()
        )

    def upsert_dedup_proposal(self, payload: dict[str, Any]) -> None:
        self._client.table("dedup_proposals").insert(payload).execute()

    def upsert_field_candidate(self, payload: dict[str, Any]) -> None:
        # Idempotent via the unique index (project_id, field_name, source_url, md5(value)).
        (
            self._client.table("project_field_candidates")
            .upsert(payload, on_conflict="project_id,field_name,source_url,candidate_value",
                    ignore_duplicates=True)
            .execute()
        )

    def insert_media_candidate(self, payload: dict[str, Any]) -> None:
        self._client.table("project_media_candidates").insert(payload).execute()
