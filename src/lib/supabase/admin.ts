import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. SERVER-ONLY.
 *
 * The `server-only` import guarantees a build error if this is ever pulled
 * into a Client Component. This client BYPASSES RLS — use it sparingly and
 * only for trusted server-side operations (e.g. admin tasks). Never return its
 * results unfiltered to unauthorized users.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
