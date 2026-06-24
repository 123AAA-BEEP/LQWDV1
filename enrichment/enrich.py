#!/usr/bin/env python3
"""LIQWD enrichment pipeline CLI.

Dry-run is the DEFAULT. Nothing is written without --commit. Stage 0 (dedup)
runs offline from a JSON fixture (--from-json) or live from Supabase.

Examples:
  # Stage 0 dedup, dry run, offline fixture -> CSV report:
  python enrich.py --stage 0 --from-json /tmp/miss.json --report reports/miss_dedup.csv

  # Stage 0 dedup live from Supabase (still dry run):
  python enrich.py --stage 0 --city Mississauga

  # ...add --commit to write dedup_proposals.
"""

from __future__ import annotations

import argparse
import json
import sys

from liqwd_enrich.config import load_settings, SUPABASE_PROJECT_REF
from liqwd_enrich.logging_setup import get_logger, log_event
from liqwd_enrich import stage0_dedup


def _load_rows(args, settings, logger) -> list[dict]:
    if args.from_json:
        with open(args.from_json, encoding="utf-8") as fh:
            rows = json.load(fh)
        log_event(logger, "loaded_fixture", path=args.from_json, rows=len(rows))
        return rows
    from liqwd_enrich.db import Db  # lazy: only needed for live mode

    db = Db(settings)
    if args.project_id:
        row = db.fetch_project(args.project_id)
        rows = [row] if row else []
    else:
        rows = db.fetch_projects_for_city(args.city)
    log_event(logger, "loaded_db_rows", city=args.city, rows=len(rows))
    return rows


def run_stage0(args, settings, logger) -> int:
    rows = _load_rows(args, settings, logger)
    proposals = stage0_dedup.build_proposals(rows)

    grouped = sum(len(p.member_project_ids) for p in proposals)
    print(
        f"\nStage 0 — dedup proposals for {args.city}: "
        f"{len(rows)} rows scanned, {len(proposals)} proposed groups "
        f"covering {grouped} rows ({len(rows) - grouped} singletons).\n"
    )
    for p in proposals:
        lock = "  ⚠ LOCKED-ROW" if p.spans_locked_row else ""
        print(f"  [{p.confidence:.2f}] {p.canonical_label}  (x{len(p.member_project_ids)}){lock}")
        for nm, st, sl in zip(p.member_names, p.member_statuses, p.member_slugs):
            star = " *primary" if sl == p.suggested_primary_slug else ""
            print(f"        - {nm}  [{st}]  {sl}{star}")
        print(f"        → {p.rationale}\n")

    if args.report:
        stage0_dedup.write_csv(proposals, args.report)
        print(f"CSV report written: {args.report}")

    if args.commit:
        from liqwd_enrich.db import Db

        db = Db(settings)
        run_id = db.insert_run(args.city, "0", vars(args) and {"stage": "0"})
        for p in proposals:
            db.upsert_dedup_proposal(
                {
                    "run_id": run_id,
                    "target_city": p.target_city,
                    "canonical_label": p.canonical_label,
                    "normalized_label": p.normalized_label,
                    "member_project_ids": p.member_project_ids,
                    "suggested_primary": p.suggested_primary,
                    "rationale": p.rationale,
                }
            )
        db.finish_run(run_id, {"proposals": len(proposals), "rows": len(rows)})
        print(f"\nCOMMIT: wrote {len(proposals)} dedup_proposals (run {run_id}).")
    else:
        print("\n(dry run — no writes. Re-run with --commit to stage these proposals.)")
    return 0


def _need(cond: bool, what: str) -> None:
    if not cond:
        raise SystemExit(f"Stages 1-4 require {what}. Set it in the environment (.env).")


def run_enrich(args, settings, logger) -> int:
    """Stages 1-4 over the target projects. Dry-run unless --commit."""
    import httpx
    from liqwd_enrich.config import SUPABASE_PROJECT_REF
    from liqwd_enrich import stage1_fields, stage2_images, stage3_score, stage4_copy
    from liqwd_enrich.normalize import builder_tokens

    want = {"1", "2", "3", "4"} if args.stage == "all" else {args.stage}
    _need(settings.has_search, "GOOGLE_CSE_KEY + GOOGLE_CSE_CX")
    if want & {"1", "4"}:
        _need(settings.has_anthropic, "ANTHROPIC_API_KEY")

    from liqwd_enrich.search.cse import CseClient
    cse = CseClient(settings.google_cse_key, settings.google_cse_cx)
    anthropic_client = None
    if want & {"1", "4"}:
        import anthropic
        anthropic_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    db = None
    run_id = None
    if args.commit:
        _need(settings.has_supabase, "SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY")
        from liqwd_enrich.db import Db
        db = Db(settings)
        run_id = db.insert_run(args.city, args.stage, {"stages": sorted(want)})

    rows = _load_rows(args, settings, logger)
    if args.limit:
        rows = rows[: args.limit]
    # Skip locked rows entirely — defense in depth (the DB guard also refuses).
    targets = [r for r in rows if r.get("record_status") not in ("published", "approved")]
    skipped = len(rows) - len(targets)
    http_client = httpx.Client(timeout=25.0)

    summary = {"projects": 0, "field_candidates": 0, "media_candidates": 0, "routing": {}}
    for project in targets:
        cands = []
        if "1" in want:
            snaps = []
            cands = stage1_fields.enrich_project(
                project, cse=cse, anthropic_client=anthropic_client,
                model=settings.anthropic_model, logger=logger,
                http_client=http_client, on_snapshot=snaps.append,
            )
            if db:
                for c in cands:
                    db.upsert_field_candidate(stage1_fields.candidate_to_row(c, run_id))

        media = []
        if "2" in want:
            existing = set()
            media = stage2_images.acquire_images(
                project, cse=cse, builder_tokens=builder_tokens(project.get("builder_name")),
                logger=logger, existing_urls=existing,
            )
            if db:
                for m in media:
                    db.insert_media_candidate(m.to_row())

        if "3" in want:
            res = stage3_score.score_project(project, cands, has_image=bool(media))
            summary["routing"][res.routing] = summary["routing"].get(res.routing, 0) + 1
            log_event(logger, "routed", project_id=project["id"],
                      routing=res.routing, score=res.score)

        if "4" in want and anthropic_client is not None:
            approved = {c.field_name: {"value": c.candidate_value,
                                       "is_proposed": c.is_proposed} for c in cands}
            copy = stage4_copy.draft_copy(project, approved, client=anthropic_client,
                                          model=settings.anthropic_model)
            if db:
                for c in stage4_copy.copy_to_candidates(project["id"], copy, run_id):
                    db.upsert_field_candidate(stage1_fields.candidate_to_row(c, run_id))

        summary["projects"] += 1
        summary["field_candidates"] += len(cands)
        summary["media_candidates"] += len(media)

    if db and run_id:
        db.finish_run(run_id, summary)

    print(f"\nStages {sorted(want)}: processed {summary['projects']} projects "
          f"({skipped} locked rows skipped). "
          f"{summary['field_candidates']} field candidates, "
          f"{summary['media_candidates']} media candidates. "
          f"Routing: {summary['routing']}.")
    print("(dry run — no writes.)" if not args.commit else f"COMMIT: run {run_id} written.")
    return 0


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="LIQWD project enrichment pipeline")
    p.add_argument("--city", default="Mississauga")
    p.add_argument("--project-id")
    p.add_argument("--all-gta", action="store_true")
    p.add_argument("--stage", default="0", choices=["0", "1", "2", "3", "4", "all"])
    p.add_argument("--commit", action="store_true", help="actually write (default: dry run)")
    p.add_argument("--limit", type=int)
    p.add_argument("--rate-limit", type=float, default=1.0, help="seconds between fetches")
    p.add_argument("--force", action="store_true", help="re-process already-enriched rows")
    p.add_argument("--from-json", help="Stage 0: read rows from a JSON fixture (offline)")
    p.add_argument("--report", help="write a CSV report to this path")
    p.add_argument("--verbose", action="store_true")
    args = p.parse_args(argv)

    settings = load_settings()
    logger = get_logger(args.verbose)
    log_event(logger, "start", stage=args.stage, city=args.city,
              commit=args.commit, project_ref=SUPABASE_PROJECT_REF)

    if args.stage in ("0", "all"):
        rc = run_stage0(args, settings, logger)
        if args.stage == "0":
            return rc
    if args.stage in ("1", "2", "3", "4", "all"):
        return run_enrich(args, settings, logger)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
