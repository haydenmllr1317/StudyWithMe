import { redirect } from "next/navigation";
import { PageHeading } from "@/components/ui/page-heading";
import { NotificationsView } from "@/features/notifications/notifications-view";
import { parseNotifications } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

export const dynamic="force-dynamic";
export default async function NotificationsPage(){
  const supabase=await createClient(); const {data:claims}=await supabase.auth.getClaims();
  if(typeof claims?.claims?.sub!=="string")redirect("/login");
  const {data,error}=await supabase.rpc("get_notifications",{p_limit:50});
  return <div className="space-y-9"><PageHeading description="A quiet record of encouragement on your shared sessions." title="Notifications"/>{error?<div className="border-y border-line py-8" role="alert"><p className="font-semibold text-ink">Notifications are unavailable.</p><p className="mt-2 text-sm text-muted">Refresh to try again.</p></div>:<NotificationsView items={parseNotifications(data)}/>}</div>;
}
