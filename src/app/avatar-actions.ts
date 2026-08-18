"use server";

import { revalidatePath } from "next/cache";
import { AVATAR_BUCKET, avatarBelongsToUser } from "@/lib/avatar";
import { createClient } from "@/lib/supabase/server";

export type AvatarActionState = { avatarPath?: string | null; message?: string; success?: string };
export const initialAvatarState: AvatarActionState = {};

async function authenticatedProfile() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!userId) return null;
  const profile = await supabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
  return { profile, supabase, userId };
}

export async function finalizeAvatarAction(path: string): Promise<AvatarActionState> {
  const context = await authenticatedProfile();
  if (!context) return { message: "Log in again to change your photo." };
  if (context.profile.error) return { message: "Your profile could not be loaded. Try again." };
  if (!avatarBelongsToUser(path, context.userId)) return { message: "The uploaded photo path is invalid." };

  const updated = await context.supabase.from("profiles").update({ avatar_url: path }).eq("id", context.userId).select("avatar_url").maybeSingle();
  if (updated.error || !updated.data) {
    return { message: "The photo uploaded, but your profile could not be updated." };
  }
  const previous = context.profile.data?.avatar_url;
  if (avatarBelongsToUser(previous, context.userId)) {
    await context.supabase.storage.from(AVATAR_BUCKET).remove([previous]);
  }
  revalidatePath("/", "layout");
  return { avatarPath: path, success: "Profile photo updated." };
}

export async function removeAvatarAction(): Promise<AvatarActionState> {
  const context = await authenticatedProfile();
  if (!context) return { message: "Log in again to remove your photo." };
  if (context.profile.error) return { message: "Your profile could not be loaded. Try again." };
  const updated = await context.supabase.from("profiles").update({ avatar_url: null }).eq("id", context.userId).select("id").maybeSingle();
  if (updated.error || !updated.data) return { message: "The photo could not be removed. Try again." };
  const previous = context.profile.data?.avatar_url;
  if (avatarBelongsToUser(previous, context.userId)) {
    await context.supabase.storage.from(AVATAR_BUCKET).remove([previous]);
  }
  revalidatePath("/", "layout");
  return { avatarPath: null, success: "Profile photo removed." };
}
