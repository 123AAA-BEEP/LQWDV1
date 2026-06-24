"""Claude structured field extraction via forced tool use.

Mirrors the app's seo.ts pattern (Opus 4.8, forced `tool_choice`). The model
is instructed to extract ONLY facts present in the supplied source text and to
return null for anything absent — no guessing, no outside knowledge. Each field
carries the model's own confidence and, where stated, an observed freshness
date so stale facts can be down-ranked.
"""

from __future__ import annotations

import json
from typing import Any

from ..stages import FIELD_SCHEMA, CONSTRUCTION_STATUS, SALES_STATUS, LISTING_TYPE

_SYSTEM = (
    "You are a meticulous real-estate data extractor for pre-construction / new "
    "homes in Ontario, Canada. Extract structured facts ONLY from the supplied "
    "source text. Never use outside knowledge, never guess. If a field is not "
    "stated in the text, return null for it. Prices are CAD. Return a confidence "
    "0-1 per field reflecting how explicitly the source states it, and an "
    "observed_date (ISO) when the source dates the fact (e.g. 'as of May 2026')."
)

# Forced-tool schema. Every field optional; the model emits null when unknown.
_EMIT_TOOL = {
    "name": "emit_fields",
    "description": "Emit the extracted project fields with per-field provenance.",
    "input_schema": {
        "type": "object",
        "properties": {
            "fields": {
                "type": "object",
                "description": "Map of field_name -> {value, confidence, observed_date} or null.",
                "additionalProperties": {
                    "anyOf": [
                        {"type": "null"},
                        {
                            "type": "object",
                            "properties": {
                                "value": {"type": ["string", "number", "null"]},
                                "confidence": {"type": "number"},
                                "observed_date": {"type": ["string", "null"]},
                            },
                            "required": ["value", "confidence"],
                        },
                    ]
                },
            }
        },
        "required": ["fields"],
    },
}


def _enum_note() -> str:
    return (
        f"construction_status must be one of {sorted(CONSTRUCTION_STATUS)}; "
        f"sales_status one of {sorted(SALES_STATUS)}; "
        f"listing_type one of {sorted(LISTING_TYPE)}."
    )


def extract_fields(
    *,
    client: Any,                 # anthropic.Anthropic
    model: str,
    project_name: str,
    city: str,
    source_url: str,
    source_text: str,
    max_chars: int = 18000,
) -> dict[str, dict[str, Any]]:
    """Return {field_name: {value, confidence, observed_date}} for stated fields only."""
    prompt = (
        f"Project: {project_name} (city: {city})\n"
        f"Source URL: {source_url}\n\n"
        f"Extract these fields when present: {', '.join(FIELD_SCHEMA)}.\n"
        f"{_enum_note()}\n\n"
        f"--- SOURCE TEXT START ---\n{source_text[:max_chars]}\n--- SOURCE TEXT END ---"
    )
    resp = client.messages.create(
        model=model,
        max_tokens=2000,
        system=_SYSTEM,
        tools=[_EMIT_TOOL],
        tool_choice={"type": "tool", "name": "emit_fields"},
        messages=[{"role": "user", "content": prompt}],
    )
    for block in resp.content:
        if getattr(block, "type", None) == "tool_use" and block.name == "emit_fields":
            raw = block.input.get("fields", {}) if isinstance(block.input, dict) else {}
            return _clean(raw)
    return {}


def _clean(raw: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Drop nulls/unknown keys, clamp confidence, coerce values to strings."""
    out: dict[str, dict[str, Any]] = {}
    for key, val in raw.items():
        if key not in FIELD_SCHEMA or val is None:
            continue
        value = val.get("value")
        if value is None or value == "":
            continue
        conf = val.get("confidence")
        try:
            conf = max(0.0, min(1.0, float(conf)))
        except (TypeError, ValueError):
            conf = 0.5
        out[key] = {
            "value": str(value).strip(),
            "confidence": conf,
            "observed_date": (val.get("observed_date") or None),
        }
    return out
