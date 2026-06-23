#!/usr/bin/env python3
"""
CondoRoyalty -> LIQWD importer (review stage).

CondoRoyalty (https://www.condoroyalty.com) is a WordPress site whose condo /
townhome projects live in a `job_listing` custom post type. That CPT is NOT
exposed over the WP REST API, so we enumerate every listing from the Yoast
sitemaps and parse each page's Yoast `ld+json` (RealEstateListing +
LocalBusiness geo) plus the themed label/value fields (Price, Square Footage,
Units, Floors, Neighbourhood, Move-In).

Output is a *review* artifact, not a direct DB import:
  - out/review.csv  : one row per listing, columns aligned to public.projects
  - out/images.csv  : one row per image (hero / gallery / floorplan) with dims

Everything lands as record_status='pending_review' / is_seeded=true so it flows
through the existing admin review console. Image re-hosting to Supabase storage
and WebP re-encoding happen at the approved-import step, NOT here -- review.csv
only references source URLs + native dimensions so a human can judge quality.

Network: the site (or our egress proxy) 403s the default python-urllib UA, so
all fetching goes through `curl`, which is allowlisted and works.

Usage:
    python3 scrape.py --limit 40                 # validation batch
    python3 scrape.py --offset 40 --limit 100
    python3 scrape.py --all                      # full ~2,399 run
    python3 scrape.py --all --with-images        # also measure every image
"""
from __future__ import annotations
import argparse, csv, html, json, os, re, subprocess, sys, time
from collections import Counter

BASE = "https://www.condoroyalty.com"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
CACHE = os.path.join(OUT, "cache")

# Yoast splits job_listing into ...-sitemap.xml, ...-sitemap2.xml ... -sitemap13.xml
SITEMAPS = [f"{BASE}/job_listing-sitemap{n or ''}.xml" for n in [""] + list(range(2, 14))]

# Detail-block labels (used to slice "Label value Label value ..." text).
LABELS = ["Price", "Move In", "Square Footage", "Maintenance Fees", "Floors",
          "Units", "Neighbourhood", "Parking Cost", "Locker Cost", "Storeys",
          "Occupancy", "Exposure", "Availability"]

# Known GTA municipalities, longest-first so "North York" wins over "York".
GTA_CITIES = sorted([
    "Toronto", "North York", "Scarborough", "Etobicoke", "East York", "York",
    "Mississauga", "Brampton", "Caledon", "Vaughan", "Markham", "Richmond Hill",
    "Thornhill", "Concord", "Maple", "Woodbridge", "Kleinburg", "Aurora",
    "Newmarket", "King City", "Stouffville", "Whitchurch-Stouffville",
    "Oakville", "Burlington", "Milton", "Halton Hills", "Georgetown",
    "Hamilton", "Stoney Creek", "Ancaster", "Dundas", "Waterdown",
    "Ajax", "Pickering", "Whitby", "Oshawa", "Clarington", "Bowmanville",
    "Port Credit", "Cooksville", "Streetsville",
], key=len, reverse=True)

NEEDS_HERO_MIN_PX = 800   # listings whose best image is narrower than this get flagged

# --------------------------------------------------------------------------- net
def curl(url: str, out_path: str | None = None, timeout: int = 40):
    args = ["curl", "-sS", "-m", "30", "-L", url]
    if out_path:
        args += ["-o", out_path]
    try:
        r = subprocess.run(args, capture_output=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return None
    if out_path:
        return os.path.getsize(out_path) if os.path.exists(out_path) else 0
    return r.stdout if r.returncode == 0 else None

def fetch_html(url: str) -> str | None:
    raw = curl(url)
    return raw.decode("utf-8", "ignore") if raw else None

# ------------------------------------------------------------------------ parse
def strip_tags(h: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", h)).strip()

def clean(v: str | None) -> str:
    v = html.unescape((v or "").strip())
    return "" if v.upper() in ("N/A", "N", "-", "TBD", "TBA", "") else v

def grab(text: str, label: str) -> str:
    others = "|".join(re.escape(l) for l in LABELS if l != label)
    m = re.search(re.escape(label) + r"\s+(.*?)\s+(?:" + others + r"|Price List|Request|$)", text)
    return clean(m.group(1) if m else "")

def parse_ldjson(h: str):
    out = {"name": None, "url": None, "dm": None, "addr": None, "lat": None, "lng": None}
    for b in re.findall(r"<script[^>]*application/ld\+json[^>]*>(.*?)</script>", h, re.S):
        try:
            d = json.loads(b)
        except Exception:
            continue
        nodes = d.get("@graph") if isinstance(d, dict) and "@graph" in d else (d if isinstance(d, list) else [d])
        for o in nodes:
            if not isinstance(o, dict):
                continue
            t = o.get("@type"); t = t if isinstance(t, list) else [t]
            if "RealEstateListing" in t or "WebPage" in t:
                out["name"] = out["name"] or o.get("name")
                out["url"] = out["url"] or o.get("url")
                out["dm"] = out["dm"] or o.get("dateModified")
            if "LocalBusiness" in t and isinstance(o.get("address"), dict):
                a = o["address"]
                out["addr"] = out["addr"] or a.get("address")
                out["lat"] = out["lat"] or a.get("lat")
                out["lng"] = out["lng"] or a.get("lng")
    return out

def parse_money(s: str):
    """'$479,900 - $969,900' -> (479900, 969900); '$1,100,000+' -> (1100000, None)."""
    nums = [int(x.replace(",", "")) for x in re.findall(r"\$\s*([\d,]{4,})", s or "")]
    if not nums:
        return None, None
    if len(nums) >= 2:
        return min(nums), max(nums)
    return nums[0], None   # single value (often "$X+") -> price_from only

def parse_sqft(s: str):
    """'445 - 1298 Sq Ft' -> (445, 1298); '1,600 Sqft+' -> (1600, None)."""
    nums = [int(x.replace(",", "")) for x in re.findall(r"([\d,]{2,})\s*(?=Sq|sq|SQ)", s or "")]
    if not nums:
        nums = [int(x.replace(",", "")) for x in re.findall(r"([\d,]{2,})", s or "")]
    if not nums:
        return None, None
    return (min(nums), max(nums)) if len(nums) >= 2 else (nums[0], None)

def parse_int(s: str):
    m = re.search(r"\d+", s or "")
    return int(m.group()) if m else None

def parse_year(*vals):
    for v in vals:
        m = re.search(r"\b(19|20)\d{2}\b", v or "")
        if m:
            return int(m.group())
    return None

_CITYMAP = {c.lower(): c for c in GTA_CITIES}
STREET_SUFFIX = re.compile(
    r"(st|street|ave|avenue|rd|road|blvd|dr|drive|way|cres|crescent|lane|ln|pkwy"
    r"|parkway|hwy|highway|court|ct|gate|trail|terr|terrace|sq|square|circle|crt)$",
    re.I)

def _strip_admin(seg: str) -> str:
    seg = re.sub(r"\b(Ontario|ON|Canada)\b", "", seg, flags=re.I)
    seg = re.sub(r"\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b", "", seg)   # postal code
    return seg.strip(" ,")

def parse_city(addr: str) -> str:
    """Canonical GTA municipality from a free-form address.

    Prefer an exact comma-segment match (so 'Dundas St, Toronto' -> Toronto, not
    Dundas), then a word-boundary search that skips street-name collisions
    (e.g. 'York Street'), then the last meaningful segment as-is.
    """
    if not addr:
        return ""
    segs = [s.strip() for s in addr.split(",") if s.strip()]
    for seg in reversed(segs):                       # 1) exact segment match
        s = _strip_admin(seg)
        if s.lower() in _CITYMAP:
            return _CITYMAP[s.lower()]
    for c in GTA_CITIES:                             # 2) guarded word-boundary
        for m in re.finditer(r"\b" + re.escape(c) + r"\b\s*([A-Za-z]*)", addr, re.I):
            if not STREET_SUFFIX.match(m.group(1) or ""):
                return _CITYMAP[c.lower()]
    cleaned = [_strip_admin(s) for s in segs]        # 3) last resort
    cleaned = [s for s in cleaned if s and not re.match(r"^[A-Z]\d[A-Z]", s)]
    return cleaned[-1] if cleaned else ""

def guess_type(name: str) -> str:
    n = (name or "").lower()
    town = re.search(r"\btown(home|house|s)?\b", n)
    condo = "condo" in n
    if town and condo:
        return "condo_townhouse"
    if town:
        return "townhouse"
    return "condo"

# Some listing templates carry no project ld+json/h1, only a generic page name.
GENERIC_NAMES = {"explore", "search", "home", "homepage", "listings", "listing",
                 "condo royalty", "condoroyalty", "new condos", "untitled", ""}

def is_generic(n: str) -> bool:
    return (n or "").strip().lower() in GENERIC_NAMES

def title_from_slug(slug: str) -> str:
    return re.sub(r"\s+", " ", slug.replace("-", " ").replace("_", " ")).strip().title()

# ----------------------------------------------------------------------- images
CHROME = re.compile(
    r"(toronto-star|contact\.png|/logo|favicon|icon|avatar|/agent|/users/|social|whatsapp"
    r"|facebook|instagram|twitter|/2012/|placeholder|sprite|medium\.png|loader|spinner)",
    re.I)
FLOORPLAN = re.compile(r"(floor[\-_ ]?plan|/plan|layout|keyplan|site[\-_ ]?plan|-fp[\-_.]|brochure)", re.I)
IMG_RE = re.compile(r"https?://[^\s\"']+?/wp-content/uploads/[^\s\"']+?\.(?:jpg|jpeg|png|webp)", re.I)

def listing_images(h: str) -> set[str]:
    """Original (suffix-stripped) upload URLs on a page, minus obvious chrome."""
    out = set()
    for m in IMG_RE.findall(h):
        if CHROME.search(m):
            continue
        out.add(re.sub(r"-\d+x\d+(?=\.\w+$)", "", m))
    return out

_dim_cache: dict[str, tuple[int, int]] = {}
def image_dims(url: str) -> tuple[int, int]:
    if url in _dim_cache:
        return _dim_cache[url]
    os.makedirs(CACHE, exist_ok=True)
    fn = os.path.join(CACHE, re.sub(r"\W", "_", url)[-60:])
    dims = (0, 0)
    if curl(url, fn):
        try:
            o = subprocess.run(["file", "-b", fn], capture_output=True, timeout=10).stdout.decode()
            m = re.findall(r"(\d+)\s?x\s?(\d+)", o)
            if m:
                dims = (int(m[-1][0]), int(m[-1][1]))
        except Exception:
            pass
        try:
            os.remove(fn)
        except OSError:
            pass
    _dim_cache[url] = dims
    return dims

def classify_images(cands: list[str], measure: bool):
    """Return (hero_url, hero_w, hero_h, rows) where rows = [[role,url,w,h]].

    Hero preference: largest *landscape* non-floorplan image; if none has
    measured dims (or none is landscape), fall back to the largest image overall,
    else the first candidate so a listing is never left without a hero URL.
    """
    rows = []
    best_land = (0, 0, None)   # (w, h, url) largest landscape non-floorplan
    best_any = (0, 0, None)    # (w, h, url) largest of anything
    for u in cands:
        w, h = image_dims(u) if measure else (0, 0)
        role = "floorplan" if FLOORPLAN.search(u) else "image"
        rows.append([role, u, w, h])
        if w * h > best_any[0] * best_any[1]:
            best_any = (w, h, u)
        if role != "floorplan" and w >= h and w * h > best_land[0] * best_land[1]:
            best_land = (w, h, u)
    hero = best_land if best_land[2] else best_any
    if not hero[2] and cands:                       # no measured dims at all
        hero = (0, 0, cands[0])
    for r in rows:
        if r[1] == hero[2] and r[0] != "floorplan":
            r[0] = "hero"
        elif r[0] == "image":
            r[0] = "gallery"
    return hero[2], hero[0], hero[1], rows

# ------------------------------------------------------------------------- main
def get_listing_urls(use_cache=True) -> list[str]:
    os.makedirs(OUT, exist_ok=True)
    cache_f = os.path.join(OUT, "urls.txt")
    if use_cache and os.path.exists(cache_f):
        return [u for u in open(cache_f).read().splitlines() if u]
    urls = []
    for sm in SITEMAPS:
        xml = fetch_html(sm)
        if xml:
            urls += re.findall(r"<loc>(.*?)</loc>", xml)
    urls = [u for u in dict.fromkeys(urls)]  # dedupe, keep order
    open(cache_f, "w").write("\n".join(urls))
    return urls

def scrape_listing(url: str) -> dict | None:
    h = fetch_html(url)
    if not h:
        return None
    t = strip_tags(h)
    ld = parse_ldjson(h)
    h1 = re.search(r"<h1[^>]*>(.*?)</h1>", h, re.S)
    title_m = re.search(r"<title[^>]*>(.*?)</title>", h, re.S)
    title = re.sub(r"\s*[|\-–]\s*condo\s*royalty.*$", "",
                   strip_tags(title_m.group(1)) if title_m else "", flags=re.I).strip()
    slug = url.rstrip("/").split("/")[-1]
    raw = html.unescape(ld["name"] or (strip_tags(h1.group(1)) if h1 else ""))
    short = raw.split("|")[0].strip()
    if is_generic(short):                       # template without listing ld+json
        # Slug is the cleanest, most reliable name here; <title> is SEO-mangled
        # and sometimes an archive-page title ("Church Archives"), so trust it
        # only as a secondary (alt) hint.
        name = title_from_slug(slug)
        use_title = bool(title) and not is_generic(title) and "archive" not in title.lower()
        full_name = html.unescape(title) if use_title else name
    else:
        full_name, name = raw, short
    price_raw = grab(t, "Price")
    sqft_raw = grab(t, "Square Footage")
    maint_raw = grab(t, "Maintenance Fees")
    move_in = grab(t, "Move In")
    pmin, pmax = parse_money(price_raw)
    smin, smax = parse_sqft(sqft_raw)
    occ_year = parse_year(move_in, price_raw)
    addr = clean(ld["addr"])
    return {
        "url": url, "name": name, "full_name": clean(full_name),
        "addr": addr, "city": parse_city(addr),
        "lat": ld["lat"] or "", "lng": ld["lng"] or "",
        "neighbourhood": grab(t, "Neighbourhood"),
        "price_raw": price_raw, "pmin": pmin, "pmax": pmax,
        "sqft_raw": sqft_raw, "smin": smin, "smax": smax,
        "maint_raw": maint_raw, "move_in": move_in, "occ_year": occ_year,
        "units": parse_int(grab(t, "Units")),
        "storeys": parse_int(grab(t, "Floors")) or parse_int(grab(t, "Storeys")),
        "ptype": guess_type(full_name),
        "dm": (ld["dm"] or "")[:10],
        "_images": listing_images(h),
    }

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=40)
    ap.add_argument("--offset", type=int, default=0)
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--with-images", action="store_true",
                    help="download every candidate image to measure dims (slower)")
    ap.add_argument("--delay", type=float, default=0.3)
    args = ap.parse_args()

    os.makedirs(OUT, exist_ok=True)
    urls = get_listing_urls()
    if not urls:
        print("ERROR: could not load listing URLs from sitemaps", file=sys.stderr)
        sys.exit(1)
    sel = urls if args.all else urls[args.offset:args.offset + args.limit]
    print(f"Total listings in sitemaps: {len(urls)}  |  scraping: {len(sel)} "
          f"(offset {args.offset})  images={'measured' if args.with_images else 'urls only'}")

    listings = []
    for i, u in enumerate(sel, 1):
        d = scrape_listing(u)
        if d:
            listings.append(d)
            print(f"  [{i}/{len(sel)}] {d['name'][:42]:42} {d['city'][:14]:14} "
                  f"${d['pmin'] or '-'}  imgs:{len(d['_images'])}")
        else:
            print(f"  [{i}/{len(sel)}] FETCH FAILED {u}")
        time.sleep(args.delay)

    # Shared-chrome detection: an image used on >20% of listings is site furniture.
    freq = Counter()
    for d in listings:
        for img in d["_images"]:
            freq[img] += 1
    thresh = max(3, int(0.2 * len(listings)))
    shared = {img for img, n in freq.items() if n > thresh}

    review_cols = [
        "slug", "project_name", "project_name_alt", "project_type",
        "construction_status", "address_full", "city", "municipality", "province",
        "neighbourhood", "latitude", "longitude", "occupancy_estimate_text",
        "storeys", "total_units", "size_range_sqft_min", "size_range_sqft_max",
        "price_from_public", "price_to_public", "price_currency",
        "hero_image_url", "hero_image_width", "hero_image_height",
        "gallery_image_count", "needs_better_hero",
        "external_source", "external_source_url", "record_status", "is_seeded",
        "import_notes",
    ]
    review_rows, image_rows = [], []
    n_flag = 0
    for d in listings:
        slug = d["url"].rstrip("/").split("/")[-1]
        cands = sorted(img for img in d["_images"] if img not in shared)
        hero_url, hw, hh, rows = classify_images(cands, args.with_images)
        for role, url, w, h in rows:
            image_rows.append([slug, role, url, w, h])
        needs = bool(args.with_images and hero_url and max(hw, hh) and max(hw, hh) < NEEDS_HERO_MIN_PX)
        if needs:
            n_flag += 1
        cstatus = "completed" if (d["occ_year"] and d["occ_year"] < 2022) else ""
        notes = "; ".join(filter(None, [
            f"price_raw={d['price_raw']}" if d["price_raw"] else "",
            f"sqft_raw={d['sqft_raw']}" if d["sqft_raw"] else "",
            f"maintenance={d['maint_raw']}" if d["maint_raw"] else "",
            f"move_in={d['move_in']}" if d["move_in"] else "",
            f"source_last_modified={d['dm']}" if d["dm"] else "",
            "WARNING: best image < 800px, needs better hero" if needs else "",
        ]))
        review_rows.append({
            "slug": slug, "project_name": d["name"], "project_name_alt": d["full_name"],
            "project_type": d["ptype"], "construction_status": cstatus,
            "address_full": d["addr"], "city": d["city"], "municipality": d["city"],
            "province": "Ontario", "neighbourhood": d["neighbourhood"],
            "latitude": d["lat"], "longitude": d["lng"],
            "occupancy_estimate_text": d["move_in"], "storeys": d["storeys"] or "",
            "total_units": d["units"] or "",
            "size_range_sqft_min": d["smin"] or "", "size_range_sqft_max": d["smax"] or "",
            "price_from_public": d["pmin"] or "", "price_to_public": d["pmax"] or "",
            "price_currency": "CAD",
            "hero_image_url": hero_url or "", "hero_image_width": hw or "",
            "hero_image_height": hh or "", "gallery_image_count": len(cands),
            "needs_better_hero": "TRUE" if needs else "FALSE",
            "external_source": "condoroyalty", "external_source_url": d["url"],
            "record_status": "pending_review", "is_seeded": "TRUE",
            "import_notes": notes,
        })

    with open(os.path.join(OUT, "review.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=review_cols)
        w.writeheader(); w.writerows(review_rows)
    with open(os.path.join(OUT, "images.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["slug", "role", "image_url", "width", "height"])
        w.writerows(image_rows)

    print(f"\nWrote {len(review_rows)} rows -> out/review.csv")
    print(f"Wrote {len(image_rows)} image rows -> out/images.csv")
    print(f"Excluded {len(shared)} shared/chrome images (used on >{thresh} listings)")
    with_price = sum(1 for r in review_rows if r["price_from_public"])
    with_geo = sum(1 for r in review_rows if r["latitude"])
    with_addr = sum(1 for r in review_rows if r["address_full"])
    print(f"Coverage: address={with_addr}/{len(review_rows)}  geo={with_geo}/{len(review_rows)}  "
          f"price={with_price}/{len(review_rows)}")
    if args.with_images:
        print(f"Flagged needs_better_hero: {n_flag}/{len(review_rows)}")

if __name__ == "__main__":
    main()
