"use server";

import { revalidatePath } from "next/cache";
import { AVATAR_BUCKET, avatarBelongsToUser } from "@/lib/avatar";
import { createClient } from "@/lib/supabase/server";

export type AvatarActionState = { avatarPath?: string | null; message?: string; success?: string };
export const initialAvatarState: AvatarActionState = {};

const allowedTypes = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);

async function authenticatedProfile() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!userId) return null;
  const profile = await supabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
  return { profile, supabase, userId };
}

export async function uploadAvatarAction(_state: AvatarActionState, formData: FormData): Promise<AvatarActionState> {
  const context = await authenticatedProfile();
  if (!context) return { message: "Log in again to change your photo." };
  if (context.profile.error) return { message: "Your profile could not be loaded. Try again." };
  const file = formData.get("avatar");
  if (!(file instanceof File) || !file.size) return { message: "Choose a photo to upload." };
  const extension = allowedTypes.get(file.type);
  if (!extension) return { message: "Choose a JPEG, PNG, or WebP image." };
  if (file.size > 4 * 1024 * 1024) return { message: "Choose an image smaller than 4 MB." };

  const path = `${context.userId}/avatar-${crypto.randomUUID()}.${extension}`;
  const uploaded = await context.supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (uploaded.error) return { message: "The photo could not be uploaded. Try again." };

  const updated = await context.supabase.from("profiles").update({ avatar_url: path }).eq("id", context.userId);
  if (updated.error) {
    await context.supabase.storage.from(AVATAR_BUCKET).remove([path]);
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
  const updated = await context.supabase.from("profiles").update({ avatar_url: null }).eq("id", context.userId);
  if (updated.error) return { message: "The photo could not be removed. Try again." };
  const previous = context.profile.data?.avatar_url;
  if (avatarBelongsToUser(previous, context.userId)) {
    await context.supabase.storage.from(AVATAR_BUCKET).remove([previous]);
  }
  revalidatePath("/", "layout");
  return { avatarPath: null, success: "Profile photo removed." };
}
