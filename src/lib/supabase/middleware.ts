import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeRelativePath } from "@/lib/safe-redirect";

/**
 * Refreshes the Supabase auth session on every request and guards the
 * protected `/dashboard` area. Verification/role gating happens in the
 * dashboard layout/pages (DB-enforced by RLS regardless).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Keep authenticated users out of the auth screens — but honour a safe
  // in-app destination (e.g. a claim link) instead of stranding them on the
  // dashboard with the context stripped.
  if (
    user &&
    (pathname === "/login" || pathname === "/signup")
  ) {
    const target = safeRelativePath(
      request.nextUrl.searchParams.get("redirect") ??
        request.nextUrl.searchParams.get("next"),
    );
    const url = request.nextUrl.clone();
    const [targetPath, targetQuery] = target.split("?");
    url.pathname = targetPath;
    url.search = targetQuery ? `?${targetQuery}` : "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
