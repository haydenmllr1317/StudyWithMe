"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationReadAction(notificationId?: string) {
  if (notificationId && !/^[0-9a-f-]{36}$/i.test(notificationId)) return { error: "That notification is unavailable." };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string") return { error: "Log in again to update notifications." };
  const { error } = await supabase.rpc("mark_notifications_read", { ...(notificationId ? { p_notification_id: notificationId } : {}) });
  if (error) return { error: "Notifications could not be updated." };
  revalidatePath("/notifications");
  return { success: true };
}
