import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { FocusLauncher } from "@/features/today/focus-launcher";
import { formatMinutes } from "@/lib/goals/validation";
import { parseGroups } from "@/lib/groups";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") redirect("/login");

  const [goalsResult, activeResult, summaryResult, profileResult, groupsResult] = await Promise.all([
    supabase.from("study_goals").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    supabase.from("study_sessions").select("*").eq("user_id", userId).is("ended_at", null).maybeSingle(),
    supabase.rpc("get_today_study_summary"),
    supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle(),
    supabase.rpc("get_my_study_groups"),
  ]);
  for (const result of [goalsResult, activeResult, summaryResult, profileResult, groupsResult]) if (result.error) console.error("Today data lookup failed", { code: result.error.code });
  const coreDataUnavailable = Boolean(goalsResult.error || activeResult.error || summaryResult.error || profileResult.error || groupsResult.error);

  const allGoals = goalsResult.data ?? [];
  const activeGoals = allGoals.filter((goal) => !goal.is_archived);
  const activeRow = activeResult.data;
  const activeSession = activeRow ? { ...activeRow, goalName: allGoals.find((goal) => goal.id === activeRow.goal_id)?.name ?? "Study session" } : null;
  const secondsByGoal = new Map((summaryResult.data ?? []).map((row) => [row.goal_id, Number(row.duration_seconds)]));
  const completedTodaySeconds = [...secondsByGoal.values()].reduce((sum, value) => sum + value, 0);
  const targetedGoals = activeGoals.filter((goal) => goal.daily_target_minutes !== null);
  const totalDailyTarget = targetedGoals.reduce((sum, goal) => sum + (goal.daily_target_minutes ?? 0), 0);
  const timezone = profileResult.data?.timezone ?? "UTC";
  const date = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: timezone }).format(new Date());

  return <AppShell><div className="space-y-12 sm:space-y-16">
    <section aria-labelledby="today-heading">
      <div className="flex min-w-0 items-end justify-between gap-4 border-b border-line pb-4"><div className="min-w-0"><p className="truncate text-sm text-muted">{date}</p><h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl" id="today-heading">Today</h1></div><div className="shrink-0 text-right"><p className="measure-label">Completed</p><p className="mt-1 text-sm font-semibold tabular text-ink">{formatMinutes(Math.floor(completedTodaySeconds / 60))}</p></div></div>
      {!activeSession && <div className="grid grid-cols-2 border-b border-line"><div className="border-r border-line py-5 pr-5"><p className="measure-label">Daily target</p><p className="mt-2 text-2xl font-semibold tracking-[-0.03em] tabular text-ink">{totalDailyTarget ? formatMinutes(totalDailyTarget) : "Not set"}</p></div><div className="py-5 pl-5"><p className="measure-label">Active goals</p><p className="mt-2 text-2xl font-semibold tracking-[-0.03em] tabular text-ink">{activeGoals.length}</p></div></div>}
      <FocusLauncher activeSession={activeSession} circles={parseGroups(groupsResult.data)} goals={activeGoals.map(({ id, name }) => ({ id, name }))} />
      {coreDataUnavailable && <div className="mt-5 border-y border-line py-4" role="alert"><p className="text-sm font-semibold text-ink">Today’s data may be incomplete.</p><p className="mt-1 text-sm text-muted">Check your connection and refresh before starting or changing a session.</p></div>}
    </section>

    {!activeSession && <section><div className="flex items-end justify-between gap-4"><h2 className="text-xl font-semibold tracking-[-0.025em] text-ink">Today by goal</h2><Link className="text-sm font-semibold text-coral underline decoration-coral/30 underline-offset-4 hover:decoration-coral" href="/profile">Manage</Link></div>{activeGoals.length ? <div className="mt-5 border-t border-line">{activeGoals.map((goal) => { const minutes = Math.floor((secondsByGoal.get(goal.id) ?? 0) / 60); const target = goal.daily_target_minutes; const progress = target ? Math.min(100, Math.round((minutes / target) * 100)) : null; return <div className="border-b border-line py-4" key={goal.id}><div className="flex items-center justify-between gap-4"><span className="text-sm font-semibold text-ink">{goal.name}</span><span className="text-xs tabular text-muted">{target ? `${minutes} / ${target} min` : `${minutes} min`}</span></div>{progress !== null && <div aria-label={`${goal.name}: ${progress}% of daily target`} className="mt-3 h-1 bg-line" role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress}><div className="h-full bg-moss" style={{ width: `${progress}%` }} /></div>}</div>; })}</div> : <div className="mt-5 border-y border-line py-7"><p className="text-sm text-muted">Create a goal before starting a study session.</p><Link className="mt-3 inline-block text-sm font-semibold text-coral underline decoration-coral/30 underline-offset-4" href="/profile">Create your first goal</Link></div>}</section>}
  </div></AppShell>;
}
