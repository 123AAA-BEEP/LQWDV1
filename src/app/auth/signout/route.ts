import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRelativePath } from "@/lib/safe-redirect";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Optional in-app return path (e.g. the claim page's "wrong account" branch
  // sends the user back to the claim link's logged-out state). Guarded.
  let next = "/";
  try {
    const form = await request.formData();
    next = safeRelativePath(form.get("next"), "/");
  } catch {
    /* no body — default to home */
  }
  return NextResponse.redirect(new URL(next, request.url), { status: 303 });
}
