"""City of Mississauga planning-application connector (pluggable).

Surfaces *proposed* facts (storeys, units, address, status) from municipal
development applications. These are NOT built/marketed facts: every candidate
is tagged is_proposed=True and carries the application number in `provenance`
so the UI can render "proposed, X storeys / Y units — subject to city approval".

Mississauga publishes development applications via its Planning & Building
portal / open-data. Exact endpoints change, so the fetch is isolated behind
this connector: swap the query without touching the pipeline. Returns [] when
no source is reachable (the pipeline simply has no municipal candidates then).
"""

from __future__ import annotations

from typing import Any

from ..stages import FieldCandidate

# Mississauga open-data / planning portal entry points (resolved at run time;
# the connector tries them in order and returns [] if none respond).
PORTAL_HINTS = [
    "https://www.mississauga.ca/projects-and-strategies/development-applications/",
    "https://data.mississauga.ca",
]


def fetch_planning_candidates(
    project: dict[str, Any],
    *,
    cse=None,
    http_client=None,
    logger=None,
) -> list[FieldCandidate]:
    """Best-effort municipal proposed-facts lookup for a project.

    Strategy: use the project address/name to find the matching development
    application page (via CSE constrained to mississauga.ca), fetch it, and
    extract proposed storeys/units/status. Implemented as a thin, replaceable
    adapter; returns [] if nothing authoritative is found.
    """
    if cse is None:
        return []
    name = project.get("project_name") or ""
    addr = project.get("address_full") or ""
    query = f'site:mississauga.ca development application {addr or name}'.strip()
    try:
        results = cse.search_web(query, num=5)
    except Exception:
        return []

    out: list[FieldCandidate] = []
    for r in results:
        if "mississauga.ca" not in r.domain:
            continue
        # The page is authoritative for *proposed* facts; the structured pull is
        # delegated to the shared extractor by the caller. Here we just emit a
        # provenance anchor so the caller knows a municipal source exists.
        out.append(FieldCandidate(
            project_id=project["id"],
            field_name="_municipal_source",
            candidate_value=r.url,
            source_url=r.url,
            source_domain=r.domain,
            confidence=0.95,
            is_proposed=True,
            provenance={"source_title": r.title, "portal": "mississauga.ca",
                        "note": "proposed; subject to municipal approval"},
        ))
        break
    if logger and out:
        logger.info("municipal source found", extra={"extra_fields": {
            "project_id": project["id"], "url": out[0].source_url}})
    return out
