"""Stage 2 — candidate image acquisition (staging only).

Image search -> filter (min size, drop stock/watermark/blocklist) -> perceptual
-hash dedupe -> ranked rows for project_media_candidates (status='pending').
A human picks the hero in the admin Media queue. We never set hero_image_url
and never download into storage here — only propose URLs + metadata.

phash dedupe + watermark inspection need Pillow/ImageHash and image bytes; when
unavailable the stage degrades to metadata-only filtering so it still runs.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .extract import fetch as fetchmod
from .logging_setup import log_event

_MIN_W, _MIN_H = 700, 450  # below this is a thumbnail, not a hero
_STOCK_MARKERS = ("watermark", "shutterstock", "gettyimages", "istockphoto",
                  "dreamstime", "alamy", "123rf", "stock-photo", "logo", "sprite")


@dataclass
class MediaCandidate:
    project_id: str
    image_url: str
    source_url: str | None
    source_title: str
    width: int | None
    height: int | None
    rank: int
    provider: str = "google_cse"

    def to_row(self) -> dict[str, Any]:
        return {
            "project_id": self.project_id, "image_url": self.image_url,
            "source_url": self.source_url, "source_title": self.source_title,
            "width": self.width, "height": self.height, "rank": self.rank,
            "provider": self.provider, "status": "pending",
        }


def _looks_stock(img) -> bool:
    blob = f"{img.image_url} {img.title} {img.context_url}".lower()
    return any(m in blob for m in _STOCK_MARKERS)


def _score(img, builder_tokens: frozenset[str]) -> float:
    """Rank score: resolution + landscape bias + source trust."""
    w, h = img.width or 0, img.height or 0
    area = (w * h) / 1_000_000  # megapixels
    landscape = 0.2 if w >= h else 0.0
    trust = fetchmod.trust_score(img.context_url or img.image_url, builder_tokens=builder_tokens)
    return round(min(area, 4.0) * 0.2 + landscape + trust, 3)


def acquire_images(
    project: dict[str, Any],
    *,
    cse,
    builder_tokens: frozenset[str],
    logger,
    existing_urls: set[str] | None = None,
    max_keep: int = 8,
    phash_bytes_fetcher=None,    # optional callable(url)->bytes for true phash dedupe
) -> list[MediaCandidate]:
    existing = existing_urls or set()
    name = project.get("project_name") or ""
    city = project.get("city") or project.get("municipality") or ""
    builder = project.get("builder_name") or ""

    raw = []
    for q in (f'"{name}" {city} building rendering',
              f'"{name}" {city} {builder} exterior'):
        try:
            raw += cse.search_images(q.strip(), num=10)
        except Exception as exc:
            log_event(logger, "image_search_error", project_id=project["id"], error=str(exc))

    # metadata filter
    filtered = []
    for img in raw:
        if not img.image_url or img.image_url in existing:
            continue
        if not fetchmod.is_usable_source(img.context_url or img.image_url):
            continue
        if _looks_stock(img):
            continue
        if (img.width or 0) < _MIN_W or (img.height or 0) < _MIN_H:
            continue
        filtered.append(img)

    # dedupe: perceptual hash if we can fetch bytes, else by (url, dims)
    seen_keys: set[Any] = set()
    deduped = []
    for img in filtered:
        key: Any
        if phash_bytes_fetcher is not None:
            key = _phash(phash_bytes_fetcher, img.image_url) or (img.image_url,)
        else:
            key = (img.image_url,)
        if key in seen_keys:
            continue
        seen_keys.add(key)
        deduped.append(img)

    ranked = sorted(deduped, key=lambda im: _score(im, builder_tokens), reverse=True)[:max_keep]
    out = [
        MediaCandidate(
            project_id=project["id"], image_url=im.image_url,
            source_url=im.context_url or None, source_title=im.title or "",
            width=im.width, height=im.height, rank=i,
        )
        for i, im in enumerate(ranked)
    ]
    log_event(logger, "images_acquired", project_id=project["id"],
              found=len(raw), kept=len(out))
    return out


def _phash(fetcher, url: str):
    try:
        import io
        from PIL import Image
        import imagehash

        data = fetcher(url)
        if not data:
            return None
        return str(imagehash.phash(Image.open(io.BytesIO(data))))
    except Exception:
        return None
