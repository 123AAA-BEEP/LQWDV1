"""Stage 3 — completeness scoring + Minimum-Viable-Record (MVR) routing.

Combines what's already on the project row with high-confidence Stage 1
candidates + Stage 2 images to decide how a record should surface:

  ready_for_review  -> enough verified facts + an image; queue for a human to
                       approve into a publishable record.
  teaser            -> has identity + location but thin on detail; show a
                       limited public "teaser" / coming-soon card.
  needs_contribution-> too sparse; route to the "got an idea?/suggest" flow.

Pure function over already-gathered data — no network, no writes.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterable

# Fields that make a record "viable", weighted by importance to a buyer.
_WEIGHTS = {
    "address_full": 3, "city": 2, "builder_name": 2, "construction_status": 1,
    "sales_status": 1, "price_from_public": 2, "price_to_public": 1,
    "storeys": 1, "total_units": 1, "size_range_sqft_min": 1,
    "size_range_sqft_max": 1, "website_url": 1, "occupancy_estimate_text": 1,
}
_CONF_FLOOR = 0.45            # candidates below this don't count toward viability
_READY_THRESHOLD = 11        # weighted points
_TEASER_THRESHOLD = 5


@dataclass
class ScoreResult:
    project_id: str
    score: int
    max_score: int
    has_image: bool
    routing: str
    present_fields: list[str] = field(default_factory=list)
    missing_fields: list[str] = field(default_factory=list)


def _value_present(v: Any) -> bool:
    return v not in (None, "", 0)


def score_project(
    project: dict[str, Any],
    candidates: Iterable[Any],         # FieldCandidate[]
    *,
    has_image: bool,
) -> ScoreResult:
    # A field counts if the row already has it OR a confident candidate supplies it.
    confident: dict[str, float] = {}
    for c in candidates:
        if (c.confidence or 0) >= _CONF_FLOOR and c.candidate_value:
            confident[c.field_name] = max(confident.get(c.field_name, 0), c.confidence or 0)

    present, missing, score = [], [], 0
    for fname, weight in _WEIGHTS.items():
        if _value_present(project.get(fname)) or fname in confident:
            present.append(fname)
            score += weight
        else:
            missing.append(fname)

    if score >= _READY_THRESHOLD and has_image:
        routing = "ready_for_review"
    elif score >= _TEASER_THRESHOLD:
        routing = "teaser"
    else:
        routing = "needs_contribution"

    return ScoreResult(
        project_id=project["id"], score=score, max_score=sum(_WEIGHTS.values()),
        has_image=has_image, routing=routing,
        present_fields=present, missing_fields=missing,
    )
