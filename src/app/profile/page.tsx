import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/ui/page-heading";
import { ProfileView } from "@/features/profile/profile-view";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") redirect("/login");

  const [{ data: userData }, { data: profile, error: profileError }, { data: goals, error: goalsError }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("id, username, display_name, avatar_url, timezone, created_at, updated_at").eq("id", userId).maybeSingle(),
    supabase.from("study_goals").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
  ]);

  if (profileError) console.error("Authenticated profile lookup failed", { code: profileError.code });
  if (goalsError) console.error("Authenticated goals lookup failed", { code: goalsError.code });
  const email = userData.user?.email ?? "Email unavailable";

  return <AppShell><div className="space-y-9"><PageHeading title="Profile" description="Your account identity, goals, targets, and the preferences that shape your study rhythm." /><ProfileView email={email} goals={goals ?? []} profile={profile} /></div></AppShell>;
}
