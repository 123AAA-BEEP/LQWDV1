/**
 * Region registry — everything jurisdiction-specific lives here so expansion
 * is config, not code: licence verification (regulator + public register),
 * email-marketing law (CASL vs CAN-SPAM), and the buyer-protection facts the
 * SEO writer is allowed to cite per jurisdiction.
 */

export type RegionKey =
  | "ontario"
  | "british_columbia"
  | "alberta"
  | "florida"
  | "tennessee"
  | "california";
export type EmailLaw = "casl" | "can_spam";

export interface Region {
  key: RegionKey;
  label: string;
  country: "CA" | "US";
  /** How `projects.province` values map to this region. */
  provinceValues: string[];
  regulator: {
    name: string;
    shortName: string;
    licenseLabel: string;
    licenseHint: string;
    /** Public register where an admin (or the agent) can verify the licence. */
    registerUrl: string;
  };
  emailLaw: EmailLaw;
  /** True, stable buyer-protection facts the SEO generator may cite. */
  buyingNotes: string;
  /** Geo-personalized marketing voice (landing hero, signup nudges). */
  voice: {
    audienceLine: string; // hero eyebrow, e.g. "Free for verified Ontario realtors"
    microcopy: string; // hero microcopy incl. the regulator
    marketLine: string; // "new homes in Ontario" phrasing
  };
}

export const REGIONS: Record<RegionKey, Region> = {
  ontario: {
    key: "ontario",
    label: "Ontario",
    country: "CA",
    provinceValues: ["on", "ontario"],
    regulator: {
      name: "Real Estate Council of Ontario",
      shortName: "RECO",
      licenseLabel: "RECO registration #",
      licenseHint: "As shown on your RECO certificate of registration.",
      registerUrl: "https://www.reco.on.ca/public/real-estate-professional-search",
    },
    emailLaw: "casl",
    buyingNotes:
      "Ontario: new condominium purchases include a 10-day cooling-off period under the Condominium Act (condos only); deposits are typically staged; interim occupancy precedes final closing.",
    voice: {
      audienceLine: "Free for verified Ontario realtors",
      microcopy:
        "No referral fees. No brokerage change. RECO verification required.",
      marketLine: "new homes in Ontario",
    },
  },
  british_columbia: {
    key: "british_columbia",
    label: "British Columbia",
    country: "CA",
    provinceValues: ["bc", "british columbia"],
    regulator: {
      name: "BC Financial Services Authority",
      shortName: "BCFSA",
      licenseLabel: "BCFSA licence #",
      licenseHint: "Your BCFSA real-estate licence number (searchable on the BCFSA register).",
      registerUrl:
        "https://www.bcfsa.ca/public-resources/real-estate/find-professional",
    },
    emailLaw: "casl",
    buyingNotes:
      "British Columbia: buyers of development units (pre-construction) have a 7-day rescission right under the Real Estate Development Marketing Act (REDMA) after receiving the disclosure statement.",
    voice: {
      audienceLine: "Free for verified BC realtors",
      microcopy:
        "No referral fees. No brokerage change. BCFSA licence verification required.",
      marketLine: "new homes & presales in BC",
    },
  },
  alberta: {
    key: "alberta",
    label: "Alberta",
    country: "CA",
    provinceValues: ["ab", "alberta"],
    regulator: {
      name: "Real Estate Council of Alberta",
      shortName: "RECA",
      licenseLabel: "RECA licence #",
      licenseHint:
        "Your RECA real-estate licence number (searchable on RECA's Find a Licensee).",
      registerUrl: "https://www.reca.ca/consumers/find-licensed-professional/",
    },
    emailLaw: "casl",
    buyingNotes:
      "Alberta: new condominium purchases from a developer include a 10-day rescission period under the Condominium Property Act (condos only); the New Home Buyer Protection Act requires warranty coverage on new homes.",
    voice: {
      audienceLine: "Free for verified Alberta realtors",
      microcopy:
        "No referral fees. No brokerage change. RECA licence verification required.",
      marketLine: "new homes in Alberta",
    },
  },
  florida: {
    key: "florida",
    label: "Florida",
    country: "US",
    provinceValues: ["fl", "florida"],
    regulator: {
      name: "Florida DBPR — Real Estate Commission",
      shortName: "DBPR",
      licenseLabel: "Florida DBPR license # (SL/BK/BL…)",
      licenseHint:
        "Your DBPR real-estate license number, e.g. SL1234567 (sales associate) or BK1234567 (broker).",
      registerUrl: "https://www.myfloridalicense.com/wl11.asp?mode=2&search=Name",
    },
    emailLaw: "can_spam",
    buyingNotes:
      "Florida: buyers of new condominiums from a developer have a 15-day rescission period under Florida Statutes §718.503 after signing and receiving the condominium documents.",
    voice: {
      audienceLine: "Free for licensed Florida agents",
      microcopy:
        "No referral fees. No brokerage change. Florida DBPR license verification required.",
      marketLine: "new construction in Florida",
    },
  },
  tennessee: {
    key: "tennessee",
    label: "Tennessee",
    country: "US",
    provinceValues: ["tn", "tennessee"],
    regulator: {
      name: "Tennessee Real Estate Commission",
      shortName: "TREC",
      licenseLabel: "Tennessee real estate license #",
      licenseHint:
        "Your Tennessee (TREC) license number, verifiable at verify.tn.gov.",
      registerUrl: "https://verify.tn.gov/",
    },
    emailLaw: "can_spam",
    buyingNotes:
      "Tennessee: buyers of new condominiums from a developer must receive a public offering statement and may cancel within 15 days of receiving it under the Tennessee Condominium Act.",
    voice: {
      audienceLine: "Free for licensed Tennessee agents",
      microcopy:
        "No referral fees. No brokerage change. Tennessee (TREC) license verification required.",
      marketLine: "new construction in Nashville & Tennessee",
    },
  },
  california: {
    key: "california",
    label: "California",
    country: "US",
    provinceValues: ["ca", "california"],
    regulator: {
      name: "California Department of Real Estate",
      shortName: "DRE",
      licenseLabel: "California DRE license #",
      licenseHint:
        "Your California DRE license number (verifiable on the DRE public license lookup).",
      registerUrl: "https://www2.dre.ca.gov/PublicASP/pplinfo.asp",
    },
    emailLaw: "can_spam",
    buyingNotes:
      "California: new subdivisions and condominium projects are sold under a Final Public Report issued by the California DRE, which buyers must receive before entering a binding purchase agreement.",
    voice: {
      audienceLine: "Free for licensed California agents",
      microcopy:
        "No referral fees. No brokerage change. California DRE license verification required.",
      marketLine: "new construction in Los Angeles & California",
    },
  },
};

/**
 * Best-guess region for the current visitor from Vercel's geo headers —
 * personalization only, never a gate. All of Canada outside BC defaults to
 * Ontario (home market); all US traffic to Florida (our US market).
 */
export function visitorRegionKey(h: {
  get(name: string): string | null;
}): RegionKey | null {
  const country = (h.get("x-vercel-ip-country") ?? "").toUpperCase();
  const region = (h.get("x-vercel-ip-country-region") ?? "").toUpperCase();
  if (country === "CA") {
    if (region === "BC") return "british_columbia";
    if (region === "AB") return "alberta";
    return "ontario";
  }
  if (country === "US") {
    if (region === "TN") return "tennessee";
    if (region === "CA") return "california";
    return "florida";
  }
  return null;
}

/** URL slug for the /agents/[region] landing pages. */
export function regionSlug(key: RegionKey): string {
  return key.replace(/_/g, "-");
}

export function regionFromSlug(slug: string): Region | null {
  const key = slug.replace(/-/g, "_");
  return isRegionKey(key) ? REGIONS[key] : null;
}

export const REGION_KEYS = Object.keys(REGIONS) as RegionKey[];

export function isRegionKey(v: string | null | undefined): v is RegionKey {
  return Boolean(v && v in REGIONS);
}

export function regionOrDefault(v: string | null | undefined): Region {
  return isRegionKey(v) ? REGIONS[v] : REGIONS.ontario;
}

/** Maps a `projects.province` value ("ON", "British Columbia", "FL"…) to a region. */
export function regionForProvince(province: string | null | undefined): Region | null {
  if (!province) return null;
  const p = province.trim().toLowerCase();
  for (const r of Object.values(REGIONS)) {
    if (r.provinceValues.includes(p)) return r;
  }
  return null;
}
