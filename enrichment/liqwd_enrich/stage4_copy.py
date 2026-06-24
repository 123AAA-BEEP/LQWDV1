"""Stage 4 — grounded marketing copy + JSON-LD (staging only).

Drafts public-safe copy STRICTLY from verified facts (the project row + the
fields a human will approve). The model is told the facts and forbidden from
inventing any others — no amenities, prices, or dates that aren't supplied.
Proposed (planning-application) facts must be phrased as "proposed … subject to
city approval". Output is staged as field candidates (seo_* / description) for
human approval; copy is never written straight to `projects`.
"""

from __future__ import annotations

import json
from typing import Any

from .stages import FieldCandidate

_SYSTEM = (
    "You write concise, factual marketing copy for new / pre-construction homes "
    "in Ontario, Canada, for a broker marketplace. Use ONLY the facts provided. "
    "Do not invent amenities, finishes, prices, unit counts, or dates. If a fact "
    "is marked proposed=true, describe it as 'proposed, subject to municipal "
    "approval'. Neutral, trustworthy tone; no hype, no superlatives, no fabricated "
    "scarcity. Canadian spelling."
)

_EMIT_TOOL = {
    "name": "emit_copy",
    "description": "Emit public-safe copy fields grounded only in the supplied facts.",
    "input_schema": {
        "type": "object",
        "properties": {
            "seo_title": {"type": "string"},
            "seo_description": {"type": "string"},
            "description": {"type": "string", "description": "1-2 short paragraphs"},
            "highlights": {"type": "array", "items": {"type": "string"}, "maxItems": 6},
        },
        "required": ["seo_title", "seo_description", "description"],
    },
}


def _facts_block(project: dict[str, Any], approved: dict[str, dict[str, Any]]) -> str:
    facts = {
        "project_name": project.get("project_name"),
        "city": project.get("city") or project.get("municipality"),
        "builder_name": project.get("builder_name"),
    }
    for fname, payload in approved.items():
        facts[fname] = {"value": payload.get("value"),
                        "proposed": payload.get("is_proposed", False)}
    return json.dumps({k: v for k, v in facts.items() if v not in (None, "")}, indent=2)


def draft_copy(
    project: dict[str, Any],
    approved_fields: dict[str, dict[str, Any]],
    *,
    client: Any,
    model: str,
    author: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Return {seo_title, seo_description, description, highlights, json_ld}."""
    resp = client.messages.create(
        model=model, max_tokens=1200, system=_SYSTEM,
        tools=[_EMIT_TOOL], tool_choice={"type": "tool", "name": "emit_copy"},
        messages=[{
            "role": "user",
            "content": (
                "Write copy using ONLY these verified facts. Omit anything not present.\n\n"
                f"{_facts_block(project, approved_fields)}"
            ),
        }],
    )
    copy: dict[str, Any] = {}
    for block in resp.content:
        if getattr(block, "type", None) == "tool_use" and block.name == "emit_copy":
            copy = dict(block.input)
            break
    copy["json_ld"] = _build_json_ld(project, approved_fields, copy, author)
    return copy


def _build_json_ld(project, approved, copy, author) -> dict[str, Any]:
    """schema.org Residence/Product JSON-LD from verified facts only."""
    name = project.get("project_name")
    data: dict[str, Any] = {
        "@context": "https://schema.org",
        "@type": "Residence",
        "name": name,
        "description": copy.get("seo_description"),
    }
    city = project.get("city") or project.get("municipality")
    addr = (approved.get("address_full") or {}).get("value")
    if city or addr:
        data["address"] = {
            "@type": "PostalAddress",
            "addressLocality": city,
            "addressRegion": "ON",
            "addressCountry": "CA",
            **({"streetAddress": addr} if addr else {}),
        }
    if author:
        data["author"] = {"@type": "Person", "name": author.get("name"),
                          "url": author.get("url")}
    return data


def copy_to_candidates(project_id: str, copy: dict[str, Any], run_id: str | None) -> list[FieldCandidate]:
    """Stage copy outputs as field candidates for human approval."""
    out = []
    for field_name in ("seo_title", "seo_description", "description"):
        if copy.get(field_name):
            out.append(FieldCandidate(
                project_id=project_id, field_name=field_name,
                candidate_value=str(copy[field_name]), source_url=None,
                source_domain="generated", confidence=None,
                provenance={"generated": True, "run_id": run_id, "grounded": True},
            ))
    return out
