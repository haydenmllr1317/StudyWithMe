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

  const [{ data: profile, error: profileError }, { data: goals, error: goalsError }, { data: stats, error: statsError }] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, timezone, created_at, updated_at").eq("id", userId).maybeSingle(),
    supabase.from("study_goals").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    supabase.rpc("get_personal_history_stats", { p_days: 30 }),
  ]);

  if (profileError) console.error("Authenticated profile lookup failed", { code: profileError.code });
  if (goalsError) console.error("Authenticated goals lookup failed", { code: goalsError.code });
  if (statsError) console.error("Profile statistics lookup failed", { code: statsError.code });
  const email = typeof claimsData?.claims?.email === "string" ? claimsData.claims.email : "Email unavailable";

  return <AppShell><div className="space-y-9"><PageHeading title="Profile" />{(profileError || goalsError || statsError) && <div className="border-y border-line py-5" role="alert"><p className="font-semibold text-ink">Some profile information is unavailable.</p><p className="mt-1 text-sm text-muted">Check your connection and refresh before changing your goals.</p></div>}<ProfileView email={email} goals={goals ?? []} profile={profile} stats={stats} /></div></AppShell>;
}
