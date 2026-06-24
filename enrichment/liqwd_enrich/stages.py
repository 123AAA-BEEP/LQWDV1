"""Stage 1-4 interfaces.

These stages require open network egress + API keys, so they run OFF this
managed env (which has a host allowlist). The signatures and contracts are
fixed here; implementations land next. Each stage is dry-run by default and
writes only to the staging layer.

NOTE: nothing here fabricates. A stage that finds no value writes nothing
(leaves null). Every staged value carries {source_url, source_domain,
confidence, observed_freshness}, and planning-application values are tagged
is_proposed=True with the application number in `provenance`.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class FieldCandidate:
    project_id: str
    field_name: str
    candidate_value: str | None
    source_url: str | None
    source_domain: str | None
    confidence: float | None
    observed_freshness: str | None = None  # ISO date
    is_proposed: bool = False
    provenance: dict[str, Any] = field(default_factory=dict)


# Allowed enum values mirrored from the live CHECK constraints (validated 2026-06).
CONSTRUCTION_STATUS = {"preconstruction", "under_construction", "completed", "unknown"}
SALES_STATUS = {"coming_soon", "selling", "paused", "sold_out", "completed", "unknown"}
LISTING_TYPE = {"for_sale", "for_rent", "mixed_use"}

# The Stage 1 extraction schema (all optional; null if not found).
FIELD_SCHEMA = [
    "address_full", "address_line_1", "postal_code", "neighbourhood",
    "intersection_primary", "intersection_secondary", "latitude", "longitude",
    "builder_name", "builder_names_raw", "architect_name", "interior_designer_name",
    "construction_status", "sales_status", "ownership_type", "listing_type",
    "storeys", "total_units", "bedrooms_summary", "bathrooms_summary",
    "size_range_sqft_min", "size_range_sqft_max", "price_from_public",
    "price_to_public", "occupancy_estimate_text", "occupancy_start_date",
    "website_url", "sales_centre_name", "sales_centre_address",
    "sales_centre_phone", "sales_centre_email", "sales_centre_hours",
]


def stage1_enrich_fields(*args: Any, **kwargs: Any):
    """Search -> fetch -> Claude structured extraction -> FieldCandidate[]."""
    raise NotImplementedError("Stage 1 implemented in the off-box build step.")


def stage2_acquire_images(*args: Any, **kwargs: Any):
    """Image search -> watermark filter + perceptual-hash dedupe -> media candidates."""
    raise NotImplementedError("Stage 2 implemented in the off-box build step.")


def stage3_score(*args: Any, **kwargs: Any):
    """Completeness score + MVR routing (ready_for_review / teaser / needs_contribution)."""
    raise NotImplementedError("Stage 3 implemented in the off-box build step.")


def stage4_copy(*args: Any, **kwargs: Any):
    """Claude copy drafts + JSON-LD + author attribution, grounded only in verified facts."""
    raise NotImplementedError("Stage 4 implemented in the off-box build step.")
