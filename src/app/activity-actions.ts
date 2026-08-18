"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleLoveAction(sessionId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return { error: "This session is unavailable." };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string") return { error: "Log in again to love this session." };
  const { data, error } = await supabase.rpc("toggle_session_love", { p_session_id: sessionId });
  if (error) return { error: "The love could not be updated. Try again." };
  revalidatePath("/activity");
  return { loved: data };
}

export async function getSessionLikersAction(sessionId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return { error: "This session is unavailable.", likers: [] };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string") return { error: "Log in again to see loves.", likers: [] };
  const { data, error } = await supabase.rpc("get_session_likers", { p_session_id: sessionId });
  if (error || !Array.isArray(data)) return { error: "The people who loved this session could not be loaded.", likers: [] };
  const likers = data.flatMap((item) => {
    if (!item || Array.isArray(item) || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    return typeof record.displayName === "string" && typeof record.username === "string"
      ? [{ displayName: record.displayName, username: record.username }]
      : [];
  });
  return { likers };
}
