"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function getUnreadNotificationCountAction() {
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  if(typeof claims?.claims?.sub!=="string") return 0;
  const {data,error}=await supabase.rpc("get_unread_notification_count");
  return error ? 0 : Math.max(0,Number(data)||0);
}

export async function markNotificationsReadAction() {
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  if(typeof claims?.claims?.sub!=="string") return {error:"Sign in again to update notifications."};
  const {error}=await supabase.rpc("mark_notifications_read",{});
  if(error) return {error:"Notifications could not be marked as read."};
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return {error:null};
}
