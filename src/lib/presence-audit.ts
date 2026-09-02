import "server-only";

/**
 * "See what Google thinks of you" — the free one-time check-up of an agent's
 * Google Business Profile (playbook G2-report, free taste of the Local suite).
 *
 * Deliberately DETERMINISTIC: it reads the public Places listing and applies
 * fixed checks with fixed copy. No model call, so nothing here can invent a
 * number, a rank, or a cost (rulebook CLAIM-1/3). It uses the Places API
 * (New) — an ordinary API key with billing, available today — NOT the
 * Business Profile API, whose approval is the long pole for *managing*
 * profiles. When the key is absent the caller queues the request for a
 * hand-made report instead of pretending.
 */

export interface AuditInput {
  name: string;
  brokerage: string;
  city: string;
}

export interface AuditFinding {
  key: string;
  ok: boolean;
  title: string;
  detail: string;
  fix?: string;
}

export interface AuditReport {
  found: boolean;
  placeId: string | null;
  listingName: string | null;
  address: string | null;
  mapsUrl: string | null;
  rating: number | null;
  reviews: number;
  website: string | null;
  phone: string | null;
  hoursSet: boolean;
  photos: number;
  primaryType: string | null;
  businessStatus: string | null;
  score: number;
  findings: AuditFinding[];
  checkedAt: string;
}

export function isPlacesConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

interface Place {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  regularOpeningHours?: unknown;
  photos?: unknown[];
  primaryType?: string;
  types?: string[];
  googleMapsUri?: string;
  businessStatus?: string;
}

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.rating",
  "places.userRatingCount",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.regularOpeningHours",
  "places.photos",
  "places.primaryType",
  "places.types",
  "places.googleMapsUri",
  "places.businessStatus",
].join(",");

/** Pick the listing that is actually this person, not their brokerage's office. */
function pickListing(places: Place[], name: string): Place | null {
  const full = name.trim().toLowerCase();
  const parts = full.split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  const nameOf = (p: Place) => (p.displayName?.text ?? "").toLowerCase();
  return (
    places.find((p) => nameOf(p).includes(full)) ??
    (last.length > 2 ? places.find((p) => nameOf(p).includes(last)) ?? null : null)
  );
}

/** Runs the check-up. Returns null when Places isn't configured. Throws on API failure. */
export async function runPresenceAudit(input: AuditInput): Promise<AuditReport | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;

  const textQuery = `${input.name} ${input.brokerage} real estate agent ${input.city} Ontario`;
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery,
      regionCode: "CA",
      languageCode: "en",
      maxResultCount: 5,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`places:searchText ${res.status}`);
  const json = (await res.json()) as { places?: Place[] };
  const place = pickListing(json.places ?? [], input.name);
  const checkedAt = new Date().toISOString();

  if (!place) {
    return {
      found: false,
      placeId: null,
      listingName: null,
      address: null,
      mapsUrl: null,
      rating: null,
      reviews: 0,
      website: null,
      phone: null,
      hoursSet: false,
      photos: 0,
      primaryType: null,
      businessStatus: null,
      score: 0,
      checkedAt,
      findings: [
        {
          key: "found",
          ok: false,
          title: "Google can't find a listing under your name",
          detail: `We searched Google Maps for "${input.name}" with ${input.brokerage} in ${input.city} and didn't find a Business Profile that's yours.`,
          fix: "Create a free Google Business Profile in your name as registered, with your brokerage identified. It is the listing that appears when someone searches you by name.",
        },
      ],
    };
  }

  const reviews = place.userRatingCount ?? 0;
  const rating = place.rating ?? null;
  const website = place.websiteUri ?? null;
  const phone = place.nationalPhoneNumber ?? null;
  const hoursSet = Boolean(place.regularOpeningHours);
  const photos = Array.isArray(place.photos) ? place.photos.length : 0;
  const primaryType = place.primaryType ?? null;
  const listingName = place.displayName?.text ?? null;
  const brokerageWord = input.brokerage.trim().toLowerCase().split(/\s+/)[0] ?? "";
  const namesBrokerage =
    brokerageWord.length > 2 && (listingName ?? "").toLowerCase().includes(brokerageWord);

  const findings: AuditFinding[] = [
    {
      key: "found",
      ok: true,
      title: "Google can find you",
      detail: `Your listing "${listingName}" shows up on Google Maps${place.formattedAddress ? ` at ${place.formattedAddress}` : ""}.`,
    },
    {
      key: "reviews",
      ok: reviews >= 10,
      title:
        reviews === 0
          ? "No reviews yet"
          : reviews >= 10
            ? `${reviews} reviews${rating ? ` · ${rating.toFixed(1)} stars` : ""}`
            : `Only ${reviews} review${reviews === 1 ? "" : "s"}${rating ? ` · ${rating.toFixed(1)} stars` : ""}`,
      detail:
        reviews === 0
          ? "A buyer who searches your name sees a listing with no reviews. Reviews are the first thing they read."
          : reviews >= 10
            ? "Enough reviews that the number itself reassures."
            : "Under ten, the count reads as new or inactive, whatever the stars say.",
      fix:
        reviews >= 10
          ? undefined
          : "Ask five past clients this week. Send each one the direct review link, not a general request.",
    },
    ...(reviews > 0 && rating != null
      ? [
          {
            key: "rating",
            ok: rating >= 4.5,
            title: rating >= 4.5 ? "Strong rating" : `Rating is ${rating.toFixed(1)}`,
            detail:
              rating >= 4.5
                ? "Your average is where buyers expect it to be."
                : "Below 4.5, the average draws the eye before anything else on the listing.",
            fix:
              rating >= 4.5
                ? undefined
                : "Reply to every review, especially the low ones, and ask recent happy clients to add theirs.",
          },
        ]
      : []),
    {
      key: "website",
      ok: Boolean(website),
      title: website ? "Website linked" : "No website on your listing",
      detail: website
        ? `Your listing links to ${website}.`
        : "The website button is empty, so the listing is a dead end.",
      fix: website ? undefined : "Add your website. If you don't have one, your free LIQWD page counts.",
    },
    {
      key: "phone",
      ok: Boolean(phone),
      title: phone ? "Phone number shown" : "No phone number",
      detail: phone
        ? "Buyers can call you straight from the listing."
        : "There's no call button on your listing.",
      fix: phone ? undefined : "Add the number you actually answer.",
    },
    {
      key: "hours",
      ok: hoursSet,
      title: hoursSet ? "Hours set" : "No hours listed",
      detail: hoursSet
        ? "Your listing shows when you're available."
        : "Google shows 'Hours not available' on your listing.",
      fix: hoursSet ? undefined : "Set hours, even if they're 'by appointment'. An empty field reads as closed.",
    },
    {
      key: "photos",
      ok: photos >= 5,
      title: photos >= 5 ? `${photos}+ photos` : photos === 0 ? "No photos" : `Only ${photos} photo${photos === 1 ? "" : "s"}`,
      detail:
        photos >= 5
          ? "Your listing has enough photos to look active."
          : "Listings with few or no photos look abandoned next to ones with a face and a storefront.",
      fix: photos >= 5 ? undefined : "Add at least five: a headshot, your brokerage, and three of the neighbourhoods you work.",
    },
    {
      key: "category",
      ok: primaryType === "real_estate_agent",
      title:
        primaryType === "real_estate_agent"
          ? "Category is Real Estate Agent"
          : `Category is "${(primaryType ?? "not set").replace(/_/g, " ")}"`,
      detail:
        primaryType === "real_estate_agent"
          ? "Google files you under the right heading."
          : "Google decides what searches you can appear for from your primary category.",
      fix:
        primaryType === "real_estate_agent"
          ? undefined
          : "Set your primary category to Real Estate Agent; add others (Real Estate Consultant, Real Estate Agency) as secondary.",
    },
    {
      key: "identification",
      ok: namesBrokerage,
      title: namesBrokerage ? "Brokerage identified" : "Brokerage not identified on the listing",
      detail: namesBrokerage
        ? "Your listing name identifies your brokerage."
        : `Your listing shows "${listingName}" without your brokerage.`,
      fix: namesBrokerage
        ? undefined
        : "RECO advertising rules expect registrants to identify their brokerage. Add it where Google allows (name or description), exactly as registered.",
    },
  ];

  const weights: Record<string, number> = {
    found: 30,
    reviews: 20,
    rating: 10,
    website: 10,
    phone: 5,
    hours: 10,
    photos: 10,
    category: 5,
  };
  const possible = findings.reduce((s, f) => s + (weights[f.key] ?? 0), 0);
  const earned = findings.reduce((s, f) => s + (f.ok ? (weights[f.key] ?? 0) : 0), 0);
  const score = possible ? Math.round((earned / possible) * 100) : 0;

  return {
    found: true,
    placeId: place.id ?? null,
    listingName,
    address: place.formattedAddress ?? null,
    mapsUrl: place.googleMapsUri ?? null,
    rating,
    reviews,
    website,
    phone,
    hoursSet,
    photos,
    primaryType,
    businessStatus: place.businessStatus ?? null,
    score,
    findings,
    checkedAt,
  };
}
