import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/ui/page-heading";
import { HistoryView } from "@/features/history/history-view";
import { parseAnalyticsData, parseAnalyticsRange } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/server";
import { parseGroups } from "@/lib/groups";
import { localDayRangeStart } from "@/lib/time/zoned-boundary";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;
export default async function HistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams; const page = Math.max(1, Number(params.page) || 1); const range = parseAnalyticsRange(params.range); const goal = typeof params.goal === "string" ? params.goal : "all";
  const supabase = await createClient(); const { data: claims } = await supabase.auth.getClaims(); const userId = claims?.claims?.sub; if (typeof userId !== "string") redirect("/login");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("timezone").eq("id",userId).single();
  const timezone = profile?.timezone ?? "UTC";
  let query = supabase.from("study_sessions").select("id,goal_id,started_at,ended_at,duration_seconds,notes,share_notes,activity_circle_id,reflection_photo_path,rating,session_type,pomodoro_minutes,paused_at,paused_seconds,user_id,created_at,updated_at",{count:"exact"}).eq("user_id",userId).not("ended_at","is",null).order("started_at",{ascending:false}).range((page-1)*PAGE_SIZE,page*PAGE_SIZE-1);
  if (goal !== "all") query=query.eq("goal_id",goal);
  const rangeDays = { "7d": 7, "30d": 30, "3m": 92, "6m": 184, "1y": 366, all: null }[range];
  if(rangeDays) query=query.gte("started_at",localDayRangeStart(timezone,rangeDays));
  const [{ data: goals, error: goalsError }, { data: stats, error: statsError },{data:sessions,count,error},groupsResult] = await Promise.all([
    supabase.from("study_goals").select("id,name,is_archived,daily_target_minutes,weekly_target_minutes").eq("user_id",userId),
    supabase.rpc("get_study_analytics",{p_scope:"mine",p_range:range,p_limit:1}),
    query,
    supabase.rpc("get_my_study_groups"),
  ]);
  const unavailable = Boolean(profileError || goalsError || statsError || error || groupsResult.error);
  for (const failure of [profileError, goalsError, statsError, error, groupsResult.error]) if (failure) console.error("History lookup failed",{code:failure.code});
  const names=new Map((goals??[]).map(g=>[g.id,g.name]));
  return <AppShell><div className="space-y-9"><PageHeading title="History"/><HistoryView analytics={parseAnalyticsData(stats)} circles={parseGroups(groupsResult.data)} error={unavailable} goals={goals??[]} page={page} pageCount={Math.max(1,Math.ceil((count??0)/PAGE_SIZE))} range={range} selectedGoal={goal} sessions={(sessions??[]).map(s=>({...s,goalName:s.goal_id?names.get(s.goal_id)??"Archived goal":"Legacy session",reflectionPhotoUrl:s.reflection_photo_path?`/activity/photo/${s.id}`:null}))} timezone={timezone}/></div></AppShell>;
}
