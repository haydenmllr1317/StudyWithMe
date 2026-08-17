"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  authErrorMessage,
  hasFieldErrors,
  normalizeEmail,
  normalizeUsername,
  readPassword,
  readText,
  type AuthActionState,
  validateLogin,
  validateSignup,
} from "@/lib/auth/validation";

function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const fieldErrors = validateLogin(formData);
  if (hasFieldErrors(fieldErrors)) return { fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(formData.get("email")),
    password: readPassword(formData.get("password")),
  });

  if (error) return { message: authErrorMessage(error.code) };
  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/today");
}

export async function signupAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const fieldErrors = validateSignup(formData);
  if (hasFieldErrors(fieldErrors)) return { fieldErrors };

  const email = normalizeEmail(formData.get("email"));
  const password = readPassword(formData.get("password"));
  const username = normalizeUsername(formData.get("username"));
  const displayName = readText(formData.get("displayName"));
  const supabase = await createClient();

  const { data: available, error: availabilityError } = await supabase.rpc(
    "is_username_available",
    { candidate: username },
  );

  if (availabilityError) {
    return { message: "We couldn’t check that username. Check your connection and try again." };
  }
  if (!available) return { fieldErrors: { username: "That username is already in use." } };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/confirm`,
      data: { display_name: displayName, username },
    },
  });

  if (error) {
    if (error.message.includes("signup username already exists")) {
      return { fieldErrors: { username: "That username is already in use." } };
    }
    return { message: authErrorMessage(error.code) };
  }

  if (!data.session) redirect("/signup/check-email");
  redirect("/today");
}

export async function logoutAction(
  _previousState: AuthActionState,
): Promise<AuthActionState> {
  void _previousState;
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) return { message: "We couldn’t sign you out. Check your connection and try again." };
  redirect("/login");
}
