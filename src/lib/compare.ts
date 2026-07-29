import { plainSlug } from "@/lib/slug";

/**
 * Comparison-page helpers — shared by /compare/[pair], the project-page
 * "compare with" links, and the sitemap's pair network.
 */

/** Canonical URL for a pair: alphabetical slug order, always. */
export function pairPath(slugA: string, slugB: string): string {
  const [x, y] = [slugA, slugB].sort();
  return `/compare/${x}-vs-${y}`;
}

export interface PairSource {
  slug: string | null;
  city: string | null;
  project_type: string | null;
  price_from_public: number | null;
}

/**
 * The qualifying pair network: within each city × type group, each project
 * pairs with its ≤3 nearest-priced peers — the combos buyers actually
 * cross-shop. Returns canonical paths, deduped.
 */
export function buildComparePairs(rows: PairSource[], perProject = 3): string[] {
  const groups = new Map<string, { slug: string; price: number }[]>();
  for (const r of rows) {
    if (!r.slug || !r.city || !r.project_type || r.price_from_public == null) {
      continue;
    }
    const key = `${plainSlug(r.city)}|${r.project_type}`;
    const g = groups.get(key) ?? [];
    g.push({ slug: r.slug, price: r.price_from_public });
    groups.set(key, g);
  }

  const paths = new Set<string>();
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    for (const p of g) {
      const nearest = g
        .filter((o) => o.slug !== p.slug)
        .sort((x, y) => Math.abs(x.price - p.price) - Math.abs(y.price - p.price))
        .slice(0, perProject);
      for (const n of nearest) paths.add(pairPath(p.slug, n.slug));
    }
  }
  return [...paths];
}
