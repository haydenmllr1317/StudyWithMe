"use server";

import { isValidTimeZone } from "@/lib/time/timezone";
import { createClient } from "@/lib/supabase/server";

export async function syncTimezoneAction(timezone: string) {
  if (!isValidTimeZone(timezone)) return false;

  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (claimsError || typeof userId !== "string") return false;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle();
  if (profileError || !profile || profile.timezone === timezone) return false;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ timezone })
    .eq("id", userId);
  if (updateError) {
    console.error("Timezone synchronization failed", { code: updateError.code });
    return false;
  }
  return true;
}
