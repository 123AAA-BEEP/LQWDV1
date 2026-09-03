import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Query params that identify a paid click or a tagged link (first touch). */
const ATTR_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
] as const;

// Next.js 16 "proxy" convention (formerly "middleware").
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---- Microsite host routing ---------------------------------------------
  // Foreign hosts (echotownswaterdown.com, …) are standalone project
  // microsites served by THIS app: rewrite every path to /sites/{host}{path},
  // preserving the path so sub-pages (/floor-plans, /pricing, /neighbourhood)
  // and per-domain robots.txt / sitemap.xml / IndexNow key all resolve.
  // The /sites tree renders only `live` configs; unknown/draft domains get a
  // noindex holding page — never liqwd.ca content (duplicate-content guard).
  // Keep this cheap: a string check, no DB in the edge path.
  const host = (request.headers.get("host") ?? "").toLowerCase().split(":")[0];
  const isPrimary =
    host === "liqwd.ca" ||
    host === "www.liqwd.ca" ||
    host.endsWith(".vercel.app") ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "";
  if (!isPrimary) {
    // One canonical host per microsite: www.* permanently redirects to the
    // apex. Vercel normally does this at the edge (attachDomainToProject
    // adds www with a 308), but keep the app-level guard so a domain
    // attached by hand can never serve the same page on two hosts.
    if (host.startsWith("www.")) {
      const url = request.nextUrl.clone();
      url.host = host.slice(4);
      url.protocol = "https";
      url.port = "";
      return NextResponse.redirect(url, 308);
    }
    const url = request.nextUrl.clone();
    url.pathname = `/sites/${host}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }
  // Primary-host robots.txt / sitemap.xml: pass straight through with ZERO
  // session work. During the Jul 17-18 outage Googlebot got a 5xx on
  // robots.txt (session middleware failure), which halts crawling for the
  // ENTIRE site — these paths are matched only so microsite domains can
  // serve their own copies above; liqwd.ca's stay outside the blast radius.
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") {
    return NextResponse.next();
  }
  // The /sites tree is internal — direct hits on the primary domain 404 via
  // the renderer's own host check, but don't even let crawlers find it.
  if (pathname.startsWith("/sites/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Vanity agent handles: liqwd.ca/@jane-smith serves /realtors/jane-smith
  // (rewrite, not redirect — the pretty URL is the point; the page's canonical
  // still declares /realtors/{slug} so search engines never see a duplicate).
  if (pathname.startsWith("/@") && pathname.length > 2) {
    const url = request.nextUrl.clone();
    url.pathname = `/realtors/${pathname.slice(2)}`;
    return NextResponse.rewrite(url);
  }

  // Fail open: a session-refresh failure (Supabase hiccup, env issue, edge
  // runtime quirk) must never 500 the entire site — public pages don't need a
  // session at all, and /dashboard falls through to requireUserProfile, which
  // redirects to /login server-side. Availability beats a perfect session.
  // Referral attribution survives navigation: an agent's shared ?ref= link
  // sets a 30-day cookie, so the buyer can browse before submitting and the
  // sharer still gets the lead (submitLead falls back to this cookie). It is
  // set on the REQUEST as well, before the session response is built, so the
  // landing request's own server components (the project page's "your
  // representative", the agent-follow strip) already see it.
  const rawRef = request.nextUrl.searchParams.get("ref");
  const ref =
    rawRef && /^[A-Za-z0-9]{4,16}$/.test(rawRef) ? rawRef.toUpperCase() : null;
  if (ref) request.cookies.set("liqwd_ref", ref);

  // First-touch ad attribution (campaign plan §6): the click's utm_* and
  // platform click ids land in a 90-day httpOnly cookie, ONLY when none is
  // set yet (first touch wins). Signup carries it into auth metadata and the
  // profile bootstrap stamps it on profiles.acquisition — so a signup can be
  // tied to the campaign that paid for it. Contains nothing about the person.
  const sp = request.nextUrl.searchParams;
  let attrCookie: string | null = null;
  if (!request.cookies.get("liqwd_attr") && ATTR_KEYS.some((k) => sp.get(k))) {
    const attr: Record<string, string> = {};
    for (const k of ATTR_KEYS) {
      const v = sp.get(k);
      if (v) attr[k] = v.slice(0, 200);
    }
    attr.landing = pathname.slice(0, 200);
    try {
      const referer = request.headers.get("referer");
      if (referer) attr.referrer = new URL(referer).hostname.slice(0, 100);
    } catch {
      /* malformed referer — skip */
    }
    attr.ts = new Date().toISOString();
    attrCookie = JSON.stringify(attr);
    request.cookies.set("liqwd_attr", attrCookie);
  }

  let response: NextResponse;
  try {
    response = await updateSession(request);
  } catch (e) {
    console.error("proxy: updateSession failed, failing open", e);
    response = NextResponse.next({ request });
  }

  if (ref) {
    response.cookies.set("liqwd_ref", ref, {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
    });
  }
  if (attrCookie) {
    response.cookies.set("liqwd_attr", attrCookie, {
      maxAge: 60 * 60 * 24 * 90,
      path: "/",
      sameSite: "lax",
      httpOnly: true,
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets. robots.txt and
     * sitemap.xml ARE matched — microsite domains need their own copies via
     * the host rewrite — but on the primary host they return immediately
     * before any session work (see above): during the Jul 17-18 outage
     * Googlebot got a 5xx on robots.txt from session middleware, which makes
     * Google halt crawling the ENTIRE site. That early return keeps them out
     * of the blast radius permanently.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
