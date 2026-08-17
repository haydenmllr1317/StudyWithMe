import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getVerifiedUserId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || typeof data?.claims?.sub !== "string") return null;
  return data.claims.sub;
}

export async function redirectIfAuthenticated() {
  if (await getVerifiedUserId()) redirect("/today");
}

