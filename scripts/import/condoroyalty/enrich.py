#!/usr/bin/env python3
"""
CondoRoyalty -> Altus enrichment (Phase 1: geo + neighbourhood).

CondoRoyalty (scraped by scrape.py) is used to ENRICH the existing
`external_source='Altus Group'` projects, which have addresses/prices but no
geo, no neighbourhood, and no descriptions. This fills the geo + neighbourhood
gaps; image re-hosting (Phase 2) and location-aware AI descriptions (Phase 3)
are separate steps (see README).

Matching is deliberately high-precision because it writes to the live DB:
exact normalized project name + compatible city family (Toronto amalgamation
handled) + CondoRoyalty geo present and inside a GTA bounding box. Writes are
NON-DESTRUCTIVE: only NULL latitude/longitude/neighbourhood are filled, published
rows are skipped, and every touched row is tagged in import_notes
('[geo/nbhd enriched from gta_seed]') so the change is auditable and reversible.

Provenance is fully anonymized per project policy: the source is recorded only
as 'gta_seed'; the real CondoRoyalty URLs live in out/_private_source_map.csv
(gitignored) and never enter the database.

Usage:
    pip install supabase
    export NEXT_PUBLIC_SUPABASE_URL=...   SUPABASE_SERVICE_ROLE_KEY=...
    python3 enrich.py            # dry run: report matches, write out/enrich.sql
    python3 enrich.py --apply    # apply geo/nbhd enrichment to the live DB
"""
from __future__ import annotations
import argparse, csv, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")

TORONTO_FAM = {'toronto', 'old toronto', 'north york', 'scarborough',
               'etobicoke', 'york', 'east york'}
GTA_BBOX = (43.0, 44.6, -80.6, -78.4)   # lat_min, lat_max, lng_min, lng_max

# --------------------------------------------------------------- pure helpers
def norm(s: str) -> str:
    s = re.sub(r'[^a-z0-9 ]', '', (s or '').lower())
    return re.sub(r'\s+', ' ', s).strip()

def cityfam(c: str) -> str:
    c = (c or '').strip().lower()
    return 'toronto_area' if c in TORONTO_FAM else c

_STOP = re.compile(r'\b(Location|Video|Lifestyle|Address|Get Directions|Ontario|'
                   r'Canada|City Condos|City Town|Town Homes|Stacked|Low-rise|'
                   r'Mid-rise|High-rise|Parking|Suite)\b', re.I)
def clean_nbhd(v: str) -> str:
    """Salvage a real neighbourhood from the scraper's sometimes-over-captured
    'Neighbourhood' field; drop anything still junky."""
    v = (v or '').strip()
    if not v:
        return ''
    if 'eighbourhood' in v:
        v = v.split('eighbourhood', 1)[1].strip()
    mm = _STOP.search(v)
    if mm:
        v = v[:mm.start()].strip()
    v = v.strip(' ,-')
    if not v or len(v) > 40 or len(v.split()) > 3 or any(ch.isdigit() for ch in v):
        return ''
    return v

def in_gta(lat, lng) -> bool:
    try:
        lat, lng = float(lat), float(lng)
    except (TypeError, ValueError):
        return False
    a, b, c, d = GTA_BBOX
    return a <= lat <= b and c <= lng <= d

def build_candidates(review_rows, altus_index):
    """altus_index: dict nname -> set(cityfam). Returns list of dicts."""
    out, seen = [], set()
    for r in review_rows:
        nn, cf = norm(r['project_name']), cityfam(r.get('city'))
        if nn not in altus_index or cf not in altus_index[nn]:
            continue
        if not in_gta(r.get('latitude'), r.get('longitude')):
            continue
        if (nn, cf) in seen:
            continue
        seen.add((nn, cf))
        out.append({'nname': nn, 'cityfam': cf,
                    'lat': float(r['latitude']), 'lng': float(r['longitude']),
                    'nbhd': clean_nbhd(r.get('neighbourhood')), 'slug': r.get('slug')})
    return out

# --------------------------------------------------------------- supabase I/O
def supabase_client():
    url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if not (url and key):
        sys.exit("ERROR: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    from supabase import create_client
    return create_client(url, key)

def fetch_altus(client):
    rows, start = [], 0
    while True:
        res = (client.table('projects')
               .select('id,project_name,city,latitude,neighbourhood')
               .eq('external_source', 'Altus Group')
               .neq('record_status', 'published')
               .range(start, start + 999).execute())
        batch = res.data or []
        rows += batch
        if len(batch) < 1000:
            break
        start += 1000
    return rows

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true', help='write to the live DB')
    args = ap.parse_args()

    review = list(csv.DictReader(open(os.path.join(OUT, 'review.csv'))))
    client = supabase_client()
    altus = fetch_altus(client)

    idx = {}
    for a in altus:
        idx.setdefault(norm(a['project_name']), set()).add(cityfam(a['city']))
    cands = build_candidates(review, idx)
    by_key = {(c['nname'], c['cityfam']): c for c in cands}

    # write the private source map (gitignored) for later image re-hosting
    with open(os.path.join(OUT, '_private_source_map.csv'), 'w', newline='') as f:
        w = csv.writer(f); w.writerow(['slug', 'project_name', 'source_url'])
        for r in review:
            w.writerow([r['slug'], r['project_name'], r['external_source_url']])

    updates = []
    for a in altus:
        c = by_key.get((norm(a['project_name']), cityfam(a['city'])))
        if not c:
            continue
        patch = {}
        if a.get('latitude') is None:
            patch['latitude'], patch['longitude'] = c['lat'], c['lng']
        if not (a.get('neighbourhood') or '').strip() and c['nbhd']:
            patch['neighbourhood'] = c['nbhd']
        if patch:
            patch['import_notes'] = '[geo/nbhd enriched from gta_seed]'
            updates.append((a['id'], a['project_name'], patch))

    print(f"Altus (non-published): {len(altus)} | distinct CR matches: {len(cands)} "
          f"| rows to enrich: {len(updates)}")
    if not args.apply:
        print("dry run — re-run with --apply to write. Sample:")
        for _id, name, patch in updates[:10]:
            print(f"  {name[:34]:34} {patch}")
        return
    for _id, name, patch in updates:
        client.table('projects').update(patch).eq('id', _id).execute()
    print(f"applied geo/neighbourhood enrichment to {len(updates)} rows")

if __name__ == '__main__':
    main()
