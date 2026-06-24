"""Google Programmable Search (CSE) client — web + image search.

Behind a tiny interface so the provider can be swapped (SERP API, Bing) without
touching the stages. CSE returns result *metadata* (URL, title, snippet, and —
for images — dimensions + context page); page bodies are fetched separately by
`extract.fetch`.

Free tier: 100 queries/day, then ~$5/1k (cap configurable). We cache nothing
here; the stages cache fetched pages via enrichment_source_snapshots.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import httpx

_ENDPOINT = "https://www.googleapis.com/customsearch/v1"


@dataclass
class WebResult:
    title: str
    url: str
    snippet: str
    domain: str


@dataclass
class ImageResult:
    image_url: str
    context_url: str       # page the image appears on
    title: str
    width: int | None
    height: int | None
    mime: str | None
    thumbnail_url: str | None
    domain: str            # domain of the context page


def _domain(url: str) -> str:
    try:
        return (urlparse(url).hostname or "").lower().lstrip("www.")
    except Exception:
        return ""


class CseClient:
    def __init__(self, api_key: str, cx: str, *, timeout: float = 20.0,
                 max_retries: int = 3, client: httpx.Client | None = None):
        if not api_key or not cx:
            raise ValueError("Google CSE requires GOOGLE_CSE_KEY and GOOGLE_CSE_CX.")
        self._key = api_key
        self._cx = cx
        self._client = client or httpx.Client(timeout=timeout)
        self._max_retries = max_retries

    def _get(self, params: dict[str, Any]) -> dict[str, Any]:
        params = {"key": self._key, "cx": self._cx, **params}
        last_exc: Exception | None = None
        for attempt in range(self._max_retries):
            try:
                r = self._client.get(_ENDPOINT, params=params)
                if r.status_code == 429:  # rate limited — back off
                    time.sleep(2 ** attempt)
                    continue
                r.raise_for_status()
                return r.json()
            except httpx.HTTPError as exc:
                last_exc = exc
                time.sleep(2 ** attempt)
        raise RuntimeError(f"CSE request failed after {self._max_retries} tries: {last_exc}")

    def search_web(self, query: str, *, num: int = 8) -> list[WebResult]:
        data = self._get({"q": query, "num": min(num, 10)})
        out: list[WebResult] = []
        for item in data.get("items", []):
            url = item.get("link", "")
            out.append(WebResult(
                title=item.get("title", ""),
                url=url,
                snippet=item.get("snippet", ""),
                domain=_domain(url),
            ))
        return out

    def search_images(self, query: str, *, num: int = 10) -> list[ImageResult]:
        data = self._get({"q": query, "searchType": "image", "num": min(num, 10),
                          "imgSize": "large", "safe": "active"})
        out: list[ImageResult] = []
        for item in data.get("items", []):
            img = item.get("image", {}) or {}
            ctx = img.get("contextLink", "") or ""
            out.append(ImageResult(
                image_url=item.get("link", ""),
                context_url=ctx,
                title=item.get("title", ""),
                width=img.get("width"),
                height=img.get("height"),
                mime=item.get("mime"),
                thumbnail_url=img.get("thumbnailLink"),
                domain=_domain(ctx or item.get("link", "")),
            ))
        return out
