# SEMrush competitive data — ingestion

Raw SEMrush exports pasted in during research sessions, preserved verbatim and
parsed into CSVs for later analysis. The goal: study how comparable real-estate
sites win organic traffic, then decide what LIQWD should build.

## Layout

```
data/semrush/
├── parse_semrush.py            # raw paste -> CSV parser
└── <domain>/                   # one folder per studied competitor
    ├── raw/                    # verbatim pastes from the SEMrush UI (source of truth)
    └── out/                    # parsed CSVs (regenerate: python3 parse_semrush.py raw/X.txt out/X.csv)
```

## CSV columns

| Column | Meaning |
|---|---|
| `keyword` | Query as reported by SEMrush |
| `intents` | Search intent flags, pipe-joined: `I`nformational, `C`ommercial, `N`avigational, `T`ransactional |
| `position` | Organic position (empty when SEMrush omitted it) |
| `serp_features` | Count of SERP features on that results page (SF column) |
| `traffic` | Estimated monthly visits driven by this keyword/URL pair |
| `traffic_pct` | Share of the site's organic traffic (`< 0.01` normalized to `0.0`) |
| `volume` | Monthly search volume, expanded (`1.6K` → `1600`) |
| `kd_pct` | Keyword difficulty (empty when `n/a`) |
| `url` | Ranking URL |

The SEMrush `Updated` column is dropped (relative timestamps like "2 days" are
meaningless after export). A row is a keyword/URL pair — the same keyword can
appear multiple times with different ranking URLs.

## Ingestion log — miamiresidential.com

| Batch | File | Rows | Export view |
|---|---|---|---|
| 01 | `miamiresidential/raw/2026-07-13-batch-01.txt` | 200 | Organic positions, sorted by **traffic** (top 2 pages) |
| 02 | `miamiresidential/raw/2026-07-13-batch-02.txt` | 200 | Organic positions, sorted by **search volume** (top 2 pages) |

## Ingestion log — newhomesource.com

| Batch | File | Format | Export view |
|---|---|---|---|
| 01 | `newhomesource/raw/2026-07-13-toppages.tsv` | normalized TSV | Top Pages (traffic by URL), top ~120 rows + tail note |
| 02 | `newhomesource/raw/2026-07-13-veryeasy-kd-by-volume.txt` | normalized table | Positions, KD = "very easy" only, sorted by volume (page 1 of 1,628) |

## Ingestion log — mattamyhomes.com

| Batch | File | Format | Export view |
|---|---|---|---|
| 01 | `mattamyhomes/raw/2026-07-13-toppages.tsv` | normalized TSV | Top Pages (traffic by URL), top ~100 rows — **US database** |
| 02 | `mattamyhomes/raw/2026-07-13-toppages-ca.tsv` | normalized TSV | Top Pages (traffic by URL), top ~100 rows — **Canadian database** |

## Ingestion log — mycondopro.ca

| Batch | File | Format | Export view |
|---|---|---|---|
| 01 | `mycondopro/raw/2026-07-13-toppages.tsv` | normalized TSV | Top Pages (traffic by URL), top 100 rows |

Analysis distilled in [`docs/seo-competitor-playbook.md`](../../docs/seo-competitor-playbook.md).
More batches expected; append to the log as they land.
