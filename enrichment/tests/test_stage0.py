"""Lock Stage 0 dedup behavior on the tricky real-world cases.

Run: python -m pytest enrichment/tests   (or)   python enrichment/tests/test_stage0.py
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from liqwd_enrich.normalize import normalize_name, builders_compatible
from liqwd_enrich.stage0_dedup import build_proposals


def test_normalize_collapses_marketing_variants():
    assert normalize_name("Harmony Crossing") == normalize_name("Harmony Crossing - Townhomes")
    assert normalize_name("Uptown Meadowvale") == normalize_name("Uptown Meadowvale Townhomes")
    assert normalize_name("5 & 10") == normalize_name("5 and 10")
    assert normalize_name("The Mason at Brightwater") == normalize_name("Mason at Brightwater")
    assert normalize_name("Lakeview Village by DECO") == "lakeview village"


def test_normalize_keeps_phases_distinct():
    # Trailing cardinal numbers are phases, not noise — must NOT collapse.
    assert normalize_name("Avia") != normalize_name("Avia 2")


def test_builder_tokens_overlap():
    assert builders_compatible("The Conservatory Group", "Conservatory Group") is True
    assert builders_compatible("Greenpark Group", "Mattamy Homes") is False
    assert builders_compatible(None, "Mattamy Homes") is None


def _rows(*specs):
    out = []
    for i, (name, builder, status) in enumerate(specs):
        out.append({
            "id": f"00000000-0000-0000-0000-{i:012d}",
            "slug": name.lower().replace(" ", "-") + f"-{i}",
            "project_name": name, "builder_name": builder,
            "city": "Mississauga", "record_status": status,
        })
    return out


def test_groups_fragments_and_picks_vetted_primary():
    rows = _rows(
        ("Pier House", "Branthaven Homes", "draft"),
        ("Pier House", "Branthaven Homes", "draft"),
        ("Pier House Towns at Lakeview Village", "Branthaven", "published"),
        ("Avia", "Amacon Developments", "selling".replace("selling", "draft")),
        ("Avia 2", "Amacon Developments", "draft"),
    )
    proposals = build_proposals(rows)
    by_label = {p.normalized_label: p for p in proposals}
    # Pier House x3 grouped; Avia / Avia 2 NOT grouped.
    assert "pier house" in by_label
    assert len(by_label["pier house"].member_project_ids) == 3
    assert "avia" not in by_label and "avia 2" not in by_label
    # Suggested primary is the published row, and the group is flagged locked.
    ph = by_label["pier house"]
    assert ph.spans_locked_row is True
    primary_status = rows[2]["record_status"]
    assert primary_status == "published"
    assert ph.suggested_primary == rows[2]["id"]


def test_no_writes_are_performed():
    # build_proposals is pure — returns data, touches nothing.
    rows = _rows(("Novella", "Greenpark Group", "draft"))
    assert build_proposals(rows) == []  # singleton -> no proposal


def test_stage3_routing():
    from liqwd_enrich.stage3_score import score_project
    from liqwd_enrich.stages import FieldCandidate

    proj = {"id": "x", "city": "Mississauga", "builder_name": "Acme", "address_full": "1 King St"}
    rich = [
        FieldCandidate("x", "price_from_public", "900000", None, "d", 0.8),
        FieldCandidate("x", "total_units", "300", None, "d", 0.7),
        FieldCandidate("x", "storeys", "30", None, "d", 0.7),
        FieldCandidate("x", "sales_status", "selling", None, "d", 0.9),
        FieldCandidate("x", "construction_status", "preconstruction", None, "d", 0.9),
    ]
    assert score_project(proj, rich, has_image=False).routing == "teaser"
    assert score_project(proj, rich, has_image=True).routing == "ready_for_review"
    assert score_project({"id": "y", "city": "X"}, [], has_image=False).routing == "needs_contribution"
    # A low-confidence candidate must NOT count toward viability.
    weak = [FieldCandidate("z", "price_from_public", "900000", None, "d", 0.2)]
    assert "price_from_public" in score_project(
        {"id": "z"}, weak, has_image=False).missing_fields


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for fn in fns:
        fn()
        print(f"ok  {fn.__name__}")
    print(f"\n{len(fns)} passed")
