"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateProfileNames, type ProfileFieldErrors } from "@/lib/auth/validation";

export type ProfileActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: ProfileFieldErrors;
  profile?: { display_name: string; username: string };
};

export async function saveProfileNamesAction(_state: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  const validated = validateProfileNames(formData);
  const profileNames = validated.data;
  if (!profileNames) return { status: "error", message: "Check the highlighted fields.", fieldErrors: validated.errors };

  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (claimsError || typeof userId !== "string") return { status: "error", message: "Your session expired. Sign in again and retry." };

  const { data, error } = await supabase.from("profiles").update(profileNames).eq("id", userId).select("display_name,username").maybeSingle();
  if (error || !data) {
    console.error("Profile name update failed", { code: error?.code });
    if (error?.code === "23505") return { status: "error", message: "That username is already in use.", fieldErrors: { username: "Choose another username." } };
    if (error?.code === "23514") return { status: "error", message: "Check the username and display name, then try again." };
    return { status: "error", message: "We couldn’t save your profile. Check your connection and try again." };
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Profile updated.", profile: data };
}
