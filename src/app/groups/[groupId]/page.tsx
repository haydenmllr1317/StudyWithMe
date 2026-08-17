import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/ui/page-heading";
import { AnalyticsCharts } from "@/features/analytics/analytics-charts";
import { TimeframeSelector } from "@/features/analytics/timeframe-selector";
import { CircleSelector } from "@/features/groups/circle-selector";
import { LeaveGroupForm, OwnerGroupControls } from "@/features/groups/group-forms";
import { parseGroup, parseGroups } from "@/lib/groups";
import { parseAnalyticsData, parseAnalyticsRange } from "@/lib/analytics";
import { formatDuration } from "@/lib/sessions/format";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CircleDetailPage({ params, searchParams }: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const id = (await params).groupId;
  const range = parseAnalyticsRange((await searchParams).range);
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string") redirect("/login");
  const [detailResult, groupsResult, analyticsResult] = await Promise.all([
    supabase.rpc("get_study_group", { p_group_id: id, p_period: "all", p_limit: 50 }),
    supabase.rpc("get_my_study_groups"),
    supabase.rpc("get_study_analytics", { p_scope: "circle", p_group_id: id, p_range: range, p_limit: 50 }),
  ]);
  if (detailResult.error?.code === "42501") notFound();
  if (detailResult.error) {
    console.error("Circle detail lookup failed", { code: detailResult.error.code });
    return <AppShell><div className="space-y-8"><PageHeading title="Circle unavailable" /><div className="border-y border-line py-7" role="alert"><p className="text-sm text-muted">Refresh to try again, or return to your Circles.</p><Link className="mt-4 inline-block text-sm font-semibold text-coral underline underline-offset-4" href="/leaderboard">Return to Circle</Link></div></div></AppShell>;
  }
  const circle = parseGroup(detailResult.data);
  if (!circle) notFound();
  const circles = parseGroups(groupsResult.data);
  const analytics = parseAnalyticsData(analyticsResult.data);
  const analyticsUnavailable = Boolean(analyticsResult.error || !analytics);
  const inviteUrl = circle.inviteToken ? `${getSiteUrl()}/join/${circle.inviteToken}` : "";

  return <AppShell><div className="space-y-10">
    <PageHeading aside={<CircleSelector circles={circles} range={range} selectedId={id} />} title="Leaderboard" />
    <div className="flex flex-wrap items-baseline justify-between gap-3"><h2 className="text-2xl font-semibold tracking-[-0.03em] text-ink">{circle.name}</h2><p className="text-xs text-muted">{circle.memberCount} {circle.memberCount === 1 ? "learner" : "learners"} · {circle.role === "owner" ? "Owner" : "Member"}</p></div>
    <section>
      <TimeframeSelector hrefFor={(item) => `/groups/${id}?range=${item}`} range={range}/>
      <div className="mt-7"><div className="flex flex-wrap items-baseline justify-between gap-3"><h2 className="text-xl font-semibold text-ink">Circle pace</h2><p className="text-xs text-muted">Calendar boundaries follow your {circle.timezone.replaceAll("_", " ")} timezone.</p></div>{analyticsUnavailable || !analytics ? <div className="mt-4 border-y border-line py-7" role="alert"><p className="font-semibold text-ink">Circle analytics are unavailable.</p><p className="mt-1 text-sm text-muted">Refresh to try again.</p></div> : analytics.leaderboard.length ? <ol className="mt-4 border-t border-line">{analytics.leaderboard.map((entry) => <li className={`grid grid-cols-[2.25rem_1fr_auto] items-center gap-3 border-b border-line py-4 ${entry.isCurrentUser ? "bg-coral-soft/35" : ""}`} key={entry.username}><span aria-label={entry.rank ? `Rank ${entry.rank}` : "Not ranked"} className="text-sm tabular text-muted"><span className="sr-only">Rank </span>{entry.rank ?? "—"}</span><span className="min-w-0"><strong className="block truncate text-sm text-ink">{entry.displayName}{entry.isCurrentUser ? " · You" : ""}</strong><span className="block truncate text-xs text-muted">@{entry.username}</span></span><strong aria-label={`${formatDuration(entry.durationSeconds)} studied`} className="text-sm tabular text-ink">{formatDuration(entry.durationSeconds)}</strong></li>)}</ol> : <div className="mt-4 border-y border-line py-7"><p className="font-semibold text-ink">No ranked study time in this timeframe.</p><p className="mt-1 text-sm text-muted">A completed Circle session will appear here.</p></div>}</div>
    </section>
    {!analyticsUnavailable && analytics && <section className="space-y-12 border-t border-line pt-9"><AnalyticsCharts data={analytics} subject="community" /></section>}
    <section className="grid gap-10 border-t border-line pt-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div><h2 className="text-xl font-semibold text-ink">Members</h2><ul className="mt-4 border-t border-line">{circle.members.map((member) => <li className="flex justify-between gap-4 border-b border-line py-3" key={member.username}><span><strong className="block text-sm text-ink">{member.displayName}</strong><span className="text-xs text-muted">@{member.username}</span></span><span className="text-xs font-semibold text-muted">{member.role === "owner" ? "Owner" : "Member"}</span></li>)}</ul></div>
      <aside className="lg:border-l lg:border-line lg:pl-8"><h2 className="text-xl font-semibold text-ink">{circle.role === "owner" ? "Circle controls" : "Membership"}</h2><div className="mt-5">{circle.role === "owner" ? <OwnerGroupControls groupId={id} inviteUrl={inviteUrl} members={circle.members} name={circle.name} /> : <LeaveGroupForm groupId={id} />}</div></aside>
    </section>
    <p className="text-xs leading-5 text-muted">Members see names, usernames, roles, aggregate totals, and feed-safe Activity. Session notes appear only when their owner explicitly shares them.</p>
  </div></AppShell>;
}
