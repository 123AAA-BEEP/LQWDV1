import type { Metadata } from "next";
import { requireUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { NotificationRow } from "@/lib/types";
import { markRead, markAllRead } from "./actions";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  new_opportunity: "New opportunity",
  new_bid: "New bid",
  bid_accepted: "Bid accepted",
  bid_declined: "Bid declined",
  bid_countered: "Bid countered",
  opportunity_update: "Opportunity update",
  admin_message: "Admin",
};

export default async function NotificationsPage() {
  const { userId } = await requireUserProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data as unknown as NotificationRow[]) ?? [];
  const unread = rows.filter((r) => !r.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Notifications
          </h1>
          <p className="mt-1 text-slate-500">
            New opportunities, bids, and developer responses land here.
          </p>
        </div>
        {unread > 0 ? (
          <form action={markAllRead}>
            <Button type="submit" size="sm" variant="secondary">
              Mark all read
            </Button>
          </form>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            You’re all caught up — no notifications yet.
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((n) => (
            <Card
              key={n.id}
              className={cn(!n.is_read && "border-brand-200 bg-brand-50/40")}
            >
              <CardBody className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge tone={n.is_read ? "neutral" : "brand"}>
                      {TYPE_LABELS[n.type] ?? n.type}
                    </Badge>
                    <p className="font-medium text-slate-800">{n.title}</p>
                  </div>
                  {n.body ? (
                    <p className="mt-1 text-sm text-slate-600">{n.body}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(n.created_at).toLocaleString("en-CA")}
                  </p>
                </div>
                {n.link_url ? (
                  <form action={markRead}>
                    <input type="hidden" name="notification_id" value={n.id} />
                    <input
                      type="hidden"
                      name="link_url"
                      value={n.link_url}
                    />
                    <Button type="submit" size="sm" variant="secondary">
                      View
                    </Button>
                  </form>
                ) : !n.is_read ? (
                  <form action={markRead}>
                    <input type="hidden" name="notification_id" value={n.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      Mark read
                    </Button>
                  </form>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
