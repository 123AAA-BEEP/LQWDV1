"""Stage 1 — field enrichment: search -> fetch -> extract -> ranked candidates.

For each project: build targeted queries, search (CSE), fetch the most
trustworthy usable pages, extract structured fields with Claude (grounded in
the fetched text only), and emit FieldCandidate rows. Final per-field
confidence = source trust x model confidence. Nothing is fabricated: a field
absent from all sources stays absent.

Writes (only with commit=True): enrichment_source_snapshots +
project_field_candidates. Never writes `projects` content.
"""

from __future__ import annotations

from dataclasses import asdict
from typing import Any, Callable

from .logging_setup import log_event
from .normalize import builder_tokens
from .stages import FieldCandidate
from .extract import fetch as fetchmod
from .extract.claude_extract import extract_fields


def build_queries(project: dict[str, Any]) -> list[str]:
    name = (project.get("project_name") or "").strip()
    city = (project.get("city") or project.get("municipality") or "").strip()
    builder = (project.get("builder_name") or "").strip()
    queries = [
        f'"{name}" {city} condos pre-construction',
        f'"{name}" {city} {builder}'.strip(),
        f'"{name}" {city} floor plans prices',
        f'"{name}" {city} site plan storeys units',
    ]
    # De-dupe while preserving order.
    seen: set[str] = set()
    out = []
    for q in queries:
        q = " ".join(q.split())
        if q and q not in seen:
            seen.add(q)
            out.append(q)
    return out


def _rank_sources(results, builder_toks) -> list[tuple[float, str]]:
    """(trust, url) for usable results, best first, de-duped by URL."""
    ranked: dict[str, float] = {}
    for r in results:
        if not fetchmod.is_usable_source(r.url):
            continue
        ranked[r.url] = max(ranked.get(r.url, 0.0),
                            fetchmod.trust_score(r.url, builder_tokens=builder_toks))
    return sorted(((t, u) for u, t in ranked.items()), reverse=True)


def enrich_project(
    project: dict[str, Any],
    *,
    cse,                         # CseClient
    anthropic_client,            # anthropic.Anthropic
    model: str,
    logger,
    max_sources: int = 5,
    http_client=None,
    on_snapshot: Callable[[fetchmod.SourceSnapshot], None] | None = None,
) -> list[FieldCandidate]:
    """Return ranked FieldCandidates for one project (no DB writes here)."""
    import httpx

    client = http_client or httpx.Client(timeout=25.0)
    builder_toks = builder_tokens(project.get("builder_name"))

    # 1) search
    urls: list[tuple[float, str]] = []
    for q in build_queries(project):
        try:
            urls += _rank_sources(cse.search_web(q, num=6), builder_toks)
        except Exception as exc:  # one bad query shouldn't kill the project
            log_event(logger, "search_error", project_id=project["id"], query=q, error=str(exc))
    # best trust first, unique, capped
    seen: set[str] = set()
    top: list[tuple[float, str]] = []
    for trust, url in sorted(urls, reverse=True):
        if url in seen:
            continue
        seen.add(url)
        top.append((trust, url))
        if len(top) >= max_sources:
            break

    # 2) fetch + 3) extract, accumulating the best candidate per field
    best: dict[str, FieldCandidate] = {}
    for trust, url in top:
        snap = fetchmod.fetch(url, client=client)
        if on_snapshot:
            on_snapshot(snap)
        if not snap.ok:
            log_event(logger, "fetch_skip", project_id=project["id"], url=url,
                      status=snap.http_status)
            continue
        try:
            extracted = extract_fields(
                client=anthropic_client, model=model,
                project_name=project.get("project_name") or "",
                city=project.get("city") or project.get("municipality") or "",
                source_url=url, source_text=snap.content_text,
            )
        except Exception as exc:
            log_event(logger, "extract_error", project_id=project["id"], url=url, error=str(exc))
            continue

        for field_name, payload in extracted.items():
            final_conf = round(trust * float(payload["confidence"]), 3)
            cand = FieldCandidate(
                project_id=project["id"],
                field_name=field_name,
                candidate_value=payload["value"],
                source_url=url,
                source_domain=snap.domain,
                confidence=final_conf,
                observed_freshness=payload.get("observed_date"),
                is_proposed=False,
                provenance={"source_title": "", "model_confidence": payload["confidence"],
                            "source_trust": trust},
            )
            cur = best.get(field_name)
            if cur is None or (cand.confidence or 0) > (cur.confidence or 0):
                best[field_name] = cand
        log_event(logger, "source_extracted", project_id=project["id"], url=url,
                  trust=trust, fields=len(extracted))

    candidates = list(best.values())
    log_event(logger, "project_enriched", project_id=project["id"],
              sources=len(top), fields_found=len(candidates))
    return candidates


def candidate_to_row(c: FieldCandidate, run_id: str | None) -> dict[str, Any]:
    d = asdict(c)
    d["run_id"] = run_id
    return d
