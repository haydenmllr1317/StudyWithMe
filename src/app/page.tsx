import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { FocusLauncher } from "@/features/today/focus-launcher";
import { GoalProgressSection } from "@/features/today/goal-progress-section";
import { ManualSessionForm } from "@/features/sessions/manual-session-form";
import { formatMinutes } from "@/lib/goals/validation";
import { parseGroups } from "@/lib/groups";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") redirect("/login");

  const [goalsResult, activeResult, summaryResult, weeklySummaryResult, profileResult, groupsResult] = await Promise.all([
    supabase.from("study_goals").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    supabase.from("study_sessions").select("*").eq("user_id", userId).is("ended_at", null).maybeSingle(),
    supabase.rpc("get_today_study_summary"),
    supabase.rpc("get_weekly_study_summary"),
    supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle(),
    supabase.rpc("get_my_study_groups"),
  ]);
  for (const result of [goalsResult, activeResult, summaryResult, weeklySummaryResult, profileResult, groupsResult]) if (result.error) console.error("Today data lookup failed", { code: result.error.code });
  const coreDataUnavailable = Boolean(goalsResult.error || activeResult.error || summaryResult.error || weeklySummaryResult.error || profileResult.error || groupsResult.error);

  const allGoals = goalsResult.data ?? [];
  const activeGoals = allGoals.filter((goal) => !goal.is_archived);
  const activeRow = activeResult.data;
  const activeSession = activeRow ? { ...activeRow, goalName: allGoals.find((goal) => goal.id === activeRow.goal_id)?.name ?? "Legacy session" } : null;
  const secondsByGoal = new Map((summaryResult.data ?? []).map((row) => [row.goal_id, Number(row.duration_seconds)]));
  const weeklySecondsByGoal = new Map((weeklySummaryResult.data ?? []).map((row) => [row.goal_id, Number(row.duration_seconds)]));
  const completedTodaySeconds = [...secondsByGoal.values()].reduce((sum, value) => sum + value, 0);
  const targetedGoals = activeGoals.filter((goal) => goal.daily_target_minutes !== null);
  const totalDailyTarget = targetedGoals.reduce((sum, goal) => sum + (goal.daily_target_minutes ?? 0), 0);
  const timezone = profileResult.data?.timezone ?? "UTC";
  const date = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: timezone }).format(new Date());
  const localParts=new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
  const part=(type:Intl.DateTimeFormatPartTypes)=>localParts.find(item=>item.type===type)?.value??"";
  const localDate=`${part("year")}-${part("month")}-${part("day")}`; const localTime=`${part("hour")}:${part("minute")}`;

  return <AppShell><div className="space-y-12 sm:space-y-16">
    <section aria-labelledby="today-heading">
      <div className="flex min-w-0 items-end justify-between gap-4 border-b border-line pb-4"><div className="min-w-0"><p className="truncate text-sm text-muted">{date}</p><h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl" id="today-heading">Today</h1></div><div className="shrink-0 text-right"><p className="measure-label">Completed</p><p className="mt-1 text-sm font-semibold tabular text-ink">{formatMinutes(Math.floor(completedTodaySeconds / 60))}</p></div></div>
      {!activeSession && <div className="grid grid-cols-2 border-b border-line"><div className="border-r border-line py-5 pr-5"><p className="measure-label">Daily target</p><p className="mt-2 text-2xl font-semibold tracking-[-0.03em] tabular text-ink">{totalDailyTarget ? formatMinutes(totalDailyTarget) : "Not set"}</p></div><div className="py-5 pl-5"><p className="measure-label">Active goals</p><p className="mt-2 text-2xl font-semibold tracking-[-0.03em] tabular text-ink">{activeGoals.length}</p></div></div>}
      <FocusLauncher activeSession={activeSession} circles={parseGroups(groupsResult.data)} goals={activeGoals.map(({ id, name }) => ({ id, name }))} />
      {!activeSession&&activeGoals.length>0&&<ManualSessionForm circles={parseGroups(groupsResult.data)} defaultDate={localDate} defaultTime={localTime} goals={activeGoals.map(({id,name})=>({id,name}))}/>}
      {coreDataUnavailable && <div className="mt-5 border-y border-line py-4" role="alert"><p className="text-sm font-semibold text-ink">Today’s data may be incomplete.</p><p className="mt-1 text-sm text-muted">Check your connection and refresh before starting or changing a session.</p></div>}
    </section>

    {!activeSession && <GoalProgressSection goals={activeGoals.map((goal) => ({ id: goal.id, name: goal.name, targetMinutes: goal.daily_target_minutes, trackedSeconds: secondsByGoal.get(goal.id) ?? 0 }))} period="daily" title="Today by goal" />}
    {!activeSession && <GoalProgressSection goals={activeGoals.map((goal) => ({ id: goal.id, name: goal.name, targetMinutes: goal.weekly_target_minutes, trackedSeconds: weeklySecondsByGoal.get(goal.id) ?? 0 }))} period="weekly" title="This Week by goal" />}
  </div></AppShell>;
}
