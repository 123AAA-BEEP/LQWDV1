"""Name / builder normalization for canonicalization & dedup (Stage 0).

The goal is a *canonical key* per development that collapses marketing
variants ("Harmony Crossing" vs "Harmony Crossing - Townhomes") WITHOUT
collapsing genuinely distinct phases ("Avia" vs "Avia 2"). Per the project's
own rule: same name + city can be legitimately separate phases — so we are
deliberately conservative and never strip trailing cardinal numbers.

Everything here is pure / side-effect free so it is trivially testable and
runs offline (no network, no DB).
"""

from __future__ import annotations

import re
import unicodedata

# Trailing descriptive product words that are noise for matching. Order does
# not matter; they are stripped repeatedly from the tail until stable.
_PRODUCT_WORDS = {
    "townhomes", "townhome", "towns", "town", "condos", "condo",
    "condominiums", "condominium", "residences", "residence", "lofts", "loft",
    "homes", "home", "estates", "estate", "collection", "suites", "apartments",
}

# Corporate suffixes stripped when tokenizing builder strings.
_BUILDER_NOISE = {
    "developments", "development", "homes", "home", "group", "groups",
    "corporation", "corporations", "corp", "inc", "incorporated", "ltd",
    "limited", "company", "co", "living", "builders", "builder", "the",
    "international", "realty", "asset", "management", "construction",
    "properties", "property", "and",
}

# Builder-string separators ("Kilmer Group and Diamond Corp, DREAM + Fram").
_BUILDER_SPLIT = re.compile(r"\s+and\s+|,|\+|&|/|\bwith\b", re.IGNORECASE)


def strip_accents(text: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c)
    )


def normalize_name(name: str | None) -> str:
    """Return a canonical match key for a project name.

    Conservative: strips leading "the", trailing product descriptors, and
    " at <community>" / " by <builder>" / " - <suffix>" tails, but preserves
    trailing numbers so phases stay distinct.
    """
    if not name:
        return ""
    s = strip_accents(name).lower().strip()
    s = s.replace("&", " and ")
    s = s.replace("'", "").replace("’", "")
    # Drop " by <builder>" and " at <community>" tails — marketing context, not identity.
    s = re.split(r"\bby\b", s, maxsplit=1)[0]
    s = re.split(r"\bat\b", s, maxsplit=1)[0]
    # Drop a " - <suffix>" tail (e.g. "Harmony Crossing - Townhomes").
    s = s.split(" - ")[0]
    # Collapse punctuation to spaces.
    s = re.sub(r"[^a-z0-9]+", " ", s).strip()
    # Strip a leading generic article.
    s = re.sub(r"^the\s+", "", s)
    # Repeatedly strip trailing product words ("... towns townhomes" -> "...").
    tokens = s.split()
    while tokens and tokens[-1] in _PRODUCT_WORDS:
        tokens.pop()
    # Also strip a leading product word ("Condominiums at Square One" -> "square one").
    while len(tokens) > 1 and tokens[0] in _PRODUCT_WORDS:
        tokens.pop(0)
    return " ".join(tokens).strip()


def builder_tokens(builder: str | None) -> frozenset[str]:
    """Significant builder name tokens, corporate noise removed.

    Used to corroborate (not drive) a match. "The Conservatory Group" and
    "Conservatory Group" both reduce to {"conservatory"}.
    """
    if not builder:
        return frozenset()
    parts = _BUILDER_SPLIT.split(strip_accents(builder).lower())
    out: set[str] = set()
    for part in parts:
        for tok in re.sub(r"[^a-z0-9]+", " ", part).split():
            if tok and tok not in _BUILDER_NOISE and len(tok) > 1:
                out.add(tok)
    return frozenset(out)


def builders_compatible(a: str | None, b: str | None) -> bool | None:
    """True if builder token sets overlap, False if disjoint, None if unknown.

    None (one side empty) is treated as "no evidence either way" by callers —
    it neither confirms nor blocks a name-based match.
    """
    ta, tb = builder_tokens(a), builder_tokens(b)
    if not ta or not tb:
        return None
    return len(ta & tb) > 0
