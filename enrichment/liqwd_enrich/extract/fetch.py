"""Fetch + main-content extraction, with source snapshots for the audit trail.

Every fact must trace to a source, so each fetch yields a SourceSnapshot
(url, status, content hash, extracted text) that the run persists to
enrichment_source_snapshots. trafilatura strips nav/boilerplate so the LLM
sees the substance, not the chrome.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx

_UA = "LIQWD-enrichment/0.1 (+https://liqwd.ca; project research bot)"

# Source-trust tiers feed candidate confidence. Higher = more authoritative.
TRUST_TIERS = {
    # builder / official sales sites are best, but those are per-project domains,
    # so they're scored dynamically (matches builder token) rather than listed.
    "tier_municipal": 0.95,   # *.ca planning portals, city sites
    "tier_known_listing": 0.75,
    "tier_generic": 0.55,
}

# Aggregators/listing portals — usable corroboration, but never the sole source
# for a "verified" fact and lower trust than official/municipal.
KNOWN_LISTING_DOMAINS = {
    "buzzbuzzhome.com", "livabl.com", "newinhomes.com", "condos.ca",
    "precondo.ca", "truecondos.com", "condonow.com", "gohome.com",
    "zolo.ca", "realtor.ca", "newhomesource.com", "altusgroup.com",
}

# Hosts we should not treat as primary sources for facts.
BLOCKLIST_DOMAINS = {"pinterest.com", "facebook.com", "instagram.com",
                     "youtube.com", "reddit.com", "twitter.com", "x.com"}


@dataclass
class SourceSnapshot:
    url: str
    domain: str
    http_status: int | None
    content_text: str
    content_hash: str
    fetched_at: str

    @property
    def ok(self) -> bool:
        return bool(self.http_status and 200 <= self.http_status < 300 and self.content_text)


def domain_of(url: str) -> str:
    try:
        return (urlparse(url).hostname or "").lower().removeprefix("www.")
    except Exception:
        return ""


def is_usable_source(url: str) -> bool:
    d = domain_of(url)
    return bool(d) and d not in BLOCKLIST_DOMAINS


def trust_score(url: str, *, builder_tokens: frozenset[str] = frozenset()) -> float:
    """Heuristic source trust in [0,1]; combined with extraction confidence later."""
    d = domain_of(url)
    if not d:
        return 0.3
    if d.endswith(".gov") or "planning" in d or d.endswith(".on.ca") or "mississauga.ca" in d:
        return TRUST_TIERS["tier_municipal"]
    # Builder/official site: domain shares a token with the builder name.
    label = d.split(".")[0]
    if builder_tokens and any(tok in label for tok in builder_tokens):
        return 0.9
    if d in KNOWN_LISTING_DOMAINS:
        return TRUST_TIERS["tier_known_listing"]
    return TRUST_TIERS["tier_generic"]


def fetch(url: str, *, client: httpx.Client, timeout: float = 25.0) -> SourceSnapshot:
    status: int | None = None
    text = ""
    try:
        r = client.get(url, timeout=timeout, follow_redirects=True,
                       headers={"User-Agent": _UA})
        status = r.status_code
        if r.status_code < 300 and "html" in r.headers.get("content-type", "").lower():
            text = _extract_main(r.text, url)
    except httpx.HTTPError:
        status = None
    digest = hashlib.sha256(text.encode("utf-8", "ignore")).hexdigest() if text else ""
    return SourceSnapshot(
        url=url,
        domain=domain_of(url),
        http_status=status,
        content_text=text,
        content_hash=digest,
        fetched_at=datetime.now(timezone.utc).isoformat(),
    )


def _extract_main(html: str, url: str) -> str:
    """Main-content text via trafilatura; degrade gracefully if absent."""
    try:
        import trafilatura

        out = trafilatura.extract(html, url=url, include_comments=False,
                                  include_tables=True, favor_precision=True)
        if out:
            return out.strip()
    except Exception:
        pass
    # Fallback: crude tag strip so the pipeline still runs without trafilatura.
    import re

    text = re.sub(r"(?is)<(script|style).*?>.*?</\1>", " ", html)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()[:20000]
