import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/ui/page-heading";
import { LeaderboardView } from "@/features/leaderboard/leaderboard-view";
import { GroupsPanel } from "@/features/groups/groups-panel";
import { parseGroups } from "@/lib/groups";
import { parseLeaderboardData, parseLeaderboardPeriod } from "@/lib/leaderboard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const period = parseLeaderboardPeriod((await searchParams).period);
  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || typeof claims?.claims?.sub !== "string") redirect("/login");
  const [{ data, error }, groupsResult] = await Promise.all([supabase.rpc("get_application_leaderboard", { p_period: period, p_limit: 50 }),supabase.rpc("get_my_study_groups")]);
  if (error) console.error("Leaderboard lookup failed", { code: error.code });
  return <AppShell><div className="space-y-9"><PageHeading title="Leaderboard" description="A calm view of how StudyWithMe learners are pacing—shared effort, without shared private details." /><LeaderboardView data={parseLeaderboardData(data)} error={Boolean(error)} period={period} /><GroupsPanel error={Boolean(groupsResult.error)} groups={parseGroups(groupsResult.data)}/></div></AppShell>;
}
