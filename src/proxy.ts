import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 "proxy" convention (formerly "middleware").
export async function proxy(request: NextRequest) {
  // Vanity agent handles: liqwd.ca/@jane-smith serves /realtors/jane-smith
  // (rewrite, not redirect — the pretty URL is the point; the page's canonical
  // still declares /realtors/{slug} so search engines never see a duplicate).
  const { pathname } = request.nextUrl;
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
     * Match all request paths except static assets:
     * _next/static, _next/image, favicon, and common image files.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
