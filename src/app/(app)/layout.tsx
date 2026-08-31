import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function ApplicationLayout({ children }: { children: ReactNode }) {
  const supabase=await createClient();
  const {data}=await supabase.rpc("get_unread_notification_count");
  return <AppShell unreadNotificationCount={Math.max(0,Number(data)||0)}>{children}</AppShell>;
}
