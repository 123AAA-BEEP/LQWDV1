import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Notification fan-out helpers. Writes go through the service-role client so a
 * realtor can notify a developer (and vice-versa) without an RLS insert path
 * that would also let users spam each other. Reads/mark-read stay on the
 * RLS-scoped per-request client.
 */

export interface NewNotification {
  user_id: string;
  type: string;
  title: string;
  body?: string | null;
  link_url?: string | null;
  opportunity_id?: string | null;
  bid_id?: string | null;
}

export async function createNotifications(
  notifications: NewNotification[],
): Promise<void> {
  if (notifications.length === 0) return;
  const admin = createAdminClient();
  await admin.from("notifications").insert(
    notifications.map((n) => ({
      user_id: n.user_id,
      type: n.type,
      title: n.title,
      body: n.body ?? null,
      link_url: n.link_url ?? null,
      opportunity_id: n.opportunity_id ?? null,
      bid_id: n.bid_id ?? null,
    })),
  );
}

export async function createNotification(n: NewNotification): Promise<void> {
  await createNotifications([n]);
}

/** Unread notification count for the signed-in user (0 when signed out). */
export async function unreadNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
  return count ?? 0;
}
