import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

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
  let response: NextResponse;
  try {
    response = await updateSession(request);
  } catch (e) {
    console.error("proxy: updateSession failed, failing open", e);
    response = NextResponse.next({ request });
  }

  // Referral attribution survives navigation: an agent's shared ?ref= link
  // sets a 30-day cookie, so the buyer can browse before submitting and the
  // sharer still gets the lead (submitLead falls back to this cookie).
  const ref = request.nextUrl.searchParams.get("ref");
  if (ref && /^[A-Za-z0-9]{4,16}$/.test(ref)) {
    response.cookies.set("liqwd_ref", ref.toUpperCase(), {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
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
