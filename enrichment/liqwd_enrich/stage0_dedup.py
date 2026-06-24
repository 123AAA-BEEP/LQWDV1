"""Stage 0 — Canonicalization & dedup (PROPOSAL ONLY).

Groups likely-duplicate project rows by normalized name (within a city) and
corroborating builder tokens, then emits a merge *proposal* per group. The bot
NEVER merges or deletes — a human reviews `dedup_proposals` / the CSV and acts
in the admin UI.

Pure logic operates on plain dicts so it runs offline against a JSON fixture
or against rows read from Supabase.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass, field, asdict
from typing import Any, Iterable

from .normalize import normalize_name, builder_tokens, builders_compatible

# Most-vetted first. The suggested primary is the most authoritative row; note
# that published/approved rows are READ-ONLY to the pipeline (they can be a
# proposal's primary, but the bot never writes them).
_STATUS_RANK = {
    "published": 0,
    "approved": 1,
    "pending_review": 2,
    "draft": 3,
    "archived": 4,
}

# Fields that signal a "complete" row, used to pick the primary when status ties.
_COMPLETENESS_FIELDS = [
    "address_full", "price_from_public", "price_to_public", "storeys",
    "total_units", "size_range_sqft_min", "size_range_sqft_max",
    "hero_image_url", "website_url",
]


@dataclass
class DedupProposal:
    canonical_label: str
    normalized_label: str
    target_city: str
    member_project_ids: list[str]
    member_slugs: list[str]
    member_names: list[str]
    member_statuses: list[str]
    builders: list[str]
    suggested_primary: str
    suggested_primary_slug: str
    confidence: float
    rationale: str
    # True if any member is published/approved (read-only) — review carefully.
    spans_locked_row: bool = False


def _completeness(row: dict[str, Any]) -> int:
    return sum(1 for f in _COMPLETENESS_FIELDS if row.get(f) not in (None, "", 0))


def _city_of(row: dict[str, Any]) -> str:
    return (row.get("city") or row.get("municipality") or "").strip().lower()


def _pick_primary(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Most authoritative row: status rank, then completeness, then shortest name."""
    return min(
        rows,
        key=lambda r: (
            _STATUS_RANK.get(r.get("record_status") or "draft", 5),
            -_completeness(r),
            len(r.get("project_name") or ""),
        ),
    )


def _group_confidence(rows: list[dict[str, Any]]) -> tuple[float, str]:
    """Confidence the group is one development + a human-readable rationale.

    Name match is exact-on-normalized (that's how they were grouped). Builders
    raise/lower confidence: all-compatible -> high; some disjoint -> medium
    (flag for review); unknown -> medium-high.
    """
    builders = [r.get("builder_name") for r in rows if r.get("builder_name")]
    compat_flags: list[bool | None] = []
    for i in range(len(rows)):
        for j in range(i + 1, len(rows)):
            compat_flags.append(
                builders_compatible(rows[i].get("builder_name"), rows[j].get("builder_name"))
            )
    has_disjoint = any(f is False for f in compat_flags)
    has_confirmed = any(f is True for f in compat_flags)

    name_key = normalize_name(rows[0].get("project_name"))
    if has_disjoint:
        conf = 0.55
        why = "builders appear to differ — verify these are the same development"
    elif has_confirmed:
        conf = 0.92
        why = "builder tokens corroborate the match"
    elif not builders:
        conf = 0.7
        why = "no builder on file to corroborate; matched on name + city alone"
    else:
        conf = 0.78
        why = "builder present on one side only; matched primarily on name + city"
    return conf, f"{len(rows)} rows share normalized name '{name_key}'; {why}."


def build_proposals(rows: Iterable[dict[str, Any]]) -> list[DedupProposal]:
    """Group rows into dedup proposals. Only groups with >1 member are returned."""
    groups: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for row in rows:
        key = (_city_of(row), normalize_name(row.get("project_name")))
        if not key[1]:
            continue  # unnameable row — skip
        groups.setdefault(key, []).append(row)

    proposals: list[DedupProposal] = []
    for (city, norm), members in sorted(groups.items()):
        if len(members) < 2:
            continue
        primary = _pick_primary(members)
        conf, rationale = _group_confidence(members)
        all_builder_tokens = sorted(
            {t for r in members for t in builder_tokens(r.get("builder_name"))}
        )
        spans_locked = any(
            (r.get("record_status") in ("published", "approved")) for r in members
        )
        if spans_locked:
            rationale += (
                " NOTE: group includes a published/approved row (read-only); "
                "suggested primary is that vetted row."
            )
        proposals.append(
            DedupProposal(
                canonical_label=primary.get("project_name") or norm,
                normalized_label=norm,
                target_city=(members[0].get("city") or members[0].get("municipality") or ""),
                member_project_ids=[r["id"] for r in members],
                member_slugs=[r.get("slug") or "" for r in members],
                member_names=[r.get("project_name") or "" for r in members],
                member_statuses=[r.get("record_status") or "" for r in members],
                builders=all_builder_tokens,
                suggested_primary=primary["id"],
                suggested_primary_slug=primary.get("slug") or "",
                confidence=round(conf, 2),
                rationale=rationale,
                spans_locked_row=spans_locked,
            )
        )
    # Highest-confidence, biggest groups first.
    proposals.sort(key=lambda p: (-p.confidence, -len(p.member_project_ids)))
    return proposals


def write_csv(proposals: list[DedupProposal], path: str) -> None:
    cols = [
        "canonical_label", "normalized_label", "target_city", "member_count",
        "confidence", "spans_locked_row", "suggested_primary_slug",
        "member_slugs", "member_names", "member_statuses", "builders",
        "suggested_primary", "member_project_ids", "rationale",
    ]
    with open(path, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(cols)
        for p in proposals:
            d = asdict(p)
            d["member_count"] = len(p.member_project_ids)
            d["member_slugs"] = " | ".join(p.member_slugs)
            d["member_names"] = " | ".join(p.member_names)
            d["member_statuses"] = " | ".join(p.member_statuses)
            d["builders"] = " | ".join(p.builders)
            d["member_project_ids"] = " | ".join(p.member_project_ids)
            w.writerow([d[c] for c in cols])
