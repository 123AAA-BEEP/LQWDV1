/**
 * Region registry — everything jurisdiction-specific lives here so expansion
 * is config, not code: licence verification (regulator + public register),
 * email-marketing law (CASL vs CAN-SPAM), and the buyer-protection facts the
 * SEO writer is allowed to cite per jurisdiction.
 */

export type RegionKey = "ontario" | "british_columbia" | "florida";
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
  },
};

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
