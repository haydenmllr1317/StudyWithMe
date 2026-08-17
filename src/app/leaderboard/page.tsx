import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/ui/page-heading";
import { Avatar } from "@/components/ui/avatar";
import { AnalyticsCharts } from "@/features/analytics/analytics-charts";
import { TimeframeSelector } from "@/features/analytics/timeframe-selector";
import { CircleSelector } from "@/features/groups/circle-selector";
import { GroupsPanel } from "@/features/groups/groups-panel";
import { parseAnalyticsData, parseAnalyticsRange } from "@/lib/analytics";
import { parseGroups } from "@/lib/groups";
import { formatDuration } from "@/lib/sessions/format";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const range = parseAnalyticsRange((await searchParams).range);
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string") redirect("/login");
  const [groupsResult, analyticsResult] = await Promise.all([
    supabase.rpc("get_my_study_groups"),
    supabase.rpc("get_study_analytics", { p_scope: "everyone", p_range: range, p_limit: 50 }),
  ]);
  const circles = parseGroups(groupsResult.data);
  const analytics = parseAnalyticsData(analyticsResult.data);
  const unavailable = Boolean(groupsResult.error || analyticsResult.error || !analytics);

  return <AppShell><div className="space-y-10">
    <PageHeading aside={<CircleSelector circles={circles} range={range}/>} title="Leaderboard" />
    {unavailable || !analytics ? <div className="border-y border-line py-8" role="alert"><h2 className="font-semibold text-ink">Leaderboard analytics are unavailable.</h2><p className="mt-2 text-sm text-muted">Refresh to try again.</p></div> : <>
      <section><TimeframeSelector hrefFor={(item) => `/leaderboard?range=${item}`} range={range}/><div className="mt-7"><h2 className="text-xl font-semibold text-ink">Everyone’s pace</h2>{analytics.leaderboard.length ? <ol className="mt-4 border-t border-line">{analytics.leaderboard.map((entry) => <li className={`grid grid-cols-[2.25rem_2.75rem_1fr_auto] items-center gap-3 border-b border-line py-4 ${entry.isCurrentUser ? "bg-coral-soft/35" : ""}`} key={entry.username}><span aria-label={entry.rank ? `Rank ${entry.rank}` : "Not ranked"} className="text-sm tabular text-muted"><span className="sr-only">Rank </span>{entry.rank ?? "—"}</span><Avatar avatarPath={entry.avatarPath} displayName={entry.displayName}/><span className="min-w-0"><strong className="block truncate text-sm text-ink">{entry.displayName}{entry.isCurrentUser ? " · You" : ""}</strong><span className="block truncate text-xs text-muted">@{entry.username}</span></span><strong aria-label={`${formatDuration(entry.durationSeconds)} studied`} className="text-sm tabular text-ink">{formatDuration(entry.durationSeconds)}</strong></li>)}</ol> : <div className="mt-4 border-y border-line py-7"><p className="font-semibold text-ink">No ranked study time in this timeframe.</p><p className="mt-1 text-sm text-muted">Completed sessions will appear here.</p></div>}</div></section>
      <section className="space-y-12 border-t border-line pt-9"><AnalyticsCharts data={analytics} subject="community" /></section>
      {!circles.length && <GroupsPanel groups={[]} />}
    </>}
  </div></AppShell>;
}
