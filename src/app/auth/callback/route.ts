import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeRelativePath } from "@/lib/safe-redirect";

/**
 * Handles redirects from Supabase auth emails (signup confirm, password
 * recovery, email change) and establishes a session.
 *
 * Supports both link formats so confirmation works regardless of which
 * device the email is opened on:
 *  - `?token_hash=…&type=…`  → verifyOtp (stateless; works cross-device)
 *  - `?code=…`               → exchangeCodeForSession (PKCE; same-device)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  // Open-redirect guard: only ever follow an in-app relative path.
  const next = safeRelativePath(searchParams.get("next"));
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Authentication link is invalid or expired.")}`,
  );
}
