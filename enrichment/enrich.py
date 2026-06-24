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
        print(
            f"\nStage {args.stage}: requires open network egress + API keys "
            "(Google CSE / Anthropic) — run off-box. Implementation pending.",
            file=sys.stderr,
        )
        return 0 if args.stage == "all" else 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
