#!/usr/bin/env python3
"""Parse raw SEMrush "Organic Research > Positions" copy-paste exports into CSV.

Raw files are verbatim pastes from the SEMrush UI. Each record is a run of
lines ending in a URL line + an "updated" line:

    <keyword>
    <intent letter>            (1+ lines: I / C / N / T)
    <position>                 (optional — missing when SEMrush omits it)
    <SF count>
    <traffic>
    <traffic %>                (float or "< 0.01")
    <volume>                   ("880", "1.6K", "27.1K", ...)
    <KD %>                     (int or "n/a")
    <domain/path URL>
    <updated>                  ("Jun 01", "2 days", "13 hours", ...)

Repeated column-header blocks appear mid-file; they are skipped.

Usage:
    python3 parse_semrush.py raw/2026-07-13-batch-01.txt out/batch-01.csv
"""

import csv
import re
import sys

HEADER_TOKENS = {
    "Keyword", "Intent", "Position", "SF", "Traffic", "Traffic %",
    "Volume", "KD %", "URL", "Updated", "Sortable", "",
}
INTENT_LETTERS = {"I", "C", "N", "T"}
FIELDS = [
    "keyword", "intents", "position", "serp_features", "traffic",
    "traffic_pct", "volume", "kd_pct", "url",
]


def parse_volume(raw: str) -> int:
    raw = raw.strip()
    if raw.endswith(("K", "k")):
        return int(float(raw[:-1]) * 1000)
    if raw.endswith(("M", "m")):
        return int(float(raw[:-1]) * 1_000_000)
    return int(raw.replace(",", ""))


def parse_traffic_pct(raw: str) -> float:
    raw = raw.strip()
    if raw.startswith("<"):
        return 0.0
    return float(raw)


def parse(path: str) -> list[dict]:
    lines = [ln.strip() for ln in open(path, encoding="utf-8")]
    url_idx = [
        i for i, ln in enumerate(lines)
        if re.match(r"^[a-z0-9.-]+\.(com|net|org|io|ca)(/\S*)?$", ln)
    ]
    records, problems = [], []
    prev_end = -1
    for u in url_idx:
        # Record block: everything since the previous record's "updated" line.
        block = [
            ln for ln in lines[prev_end + 1 : u]
            if ln not in HEADER_TOKENS
        ]
        prev_end = u + 1  # skip the "updated" line that follows the URL
        if len(block) < 6:
            problems.append((u, "short block", block))
            continue
        keyword = block[0]
        kd, volume, pct, traffic, sf = block[-1], block[-2], block[-3], block[-4], block[-5]
        middle = block[1:-5]  # intent letters + optional position
        intents = [t for t in middle if t in INTENT_LETTERS]
        numbers = [t for t in middle if re.fullmatch(r"\d+", t)]
        leftovers = [t for t in middle if t not in INTENT_LETTERS and not re.fullmatch(r"\d+", t)]
        if leftovers or len(numbers) > 1:
            problems.append((u, "odd middle", block))
        try:
            records.append({
                "keyword": keyword,
                "intents": "|".join(intents),
                "position": int(numbers[0]) if numbers else None,
                "serp_features": int(sf),
                "traffic": int(traffic),
                "traffic_pct": parse_traffic_pct(pct),
                "volume": parse_volume(volume),
                "kd_pct": None if kd.lower() == "n/a" else int(kd),
                "url": lines[u],
            })
        except (ValueError, IndexError) as exc:
            problems.append((u, f"parse error: {exc}", block))
    for where, why, block in problems:
        print(f"  WARN line {where}: {why}: {block!r}", file=sys.stderr)
    return records


def main() -> None:
    src, dst = sys.argv[1], sys.argv[2]
    records = parse(src)
    with open(dst, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(records)
    print(f"{src}: {len(records)} rows -> {dst}")


if __name__ == "__main__":
    main()
