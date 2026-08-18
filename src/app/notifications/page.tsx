import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/ui/page-heading";
import { NotificationsView } from "@/features/notifications/notifications-view";
import { parseNotifications } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string") redirect("/login");
  const { data, error } = await supabase.rpc("get_notifications", { p_limit: 50 });
  if (error) console.error("Notifications lookup failed", { code: error.code });
  return <AppShell><div className="space-y-9"><PageHeading title="Notifications" />{error?<div className="border-y border-line py-7" role="alert"><p className="font-semibold text-ink">Notifications are unavailable.</p><p className="mt-1 text-sm text-muted">Refresh to try again.</p></div>:<NotificationsView initialItems={parseNotifications(data)}/>}</div></AppShell>;
}
