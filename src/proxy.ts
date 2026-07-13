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

  return await updateSession(request);
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
