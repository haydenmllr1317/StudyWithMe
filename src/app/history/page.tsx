import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/ui/page-heading";
import { HistoryView } from "@/features/history/history-view";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;
function approximateRangeStart(days: number) { return new Date(Date.now() - (days - 1) * 86400000).toISOString(); }

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams; const page = Math.max(1, Number(params.page) || 1); const range = ["7","30","90","all"].includes(String(params.range)) ? String(params.range) : "30"; const goal = typeof params.goal === "string" ? params.goal : "all";
  const supabase = await createClient(); const { data: claims } = await supabase.auth.getClaims(); const userId = claims?.claims?.sub; if (typeof userId !== "string") redirect("/login");
  let query = supabase.from("study_sessions").select("*",{count:"exact"}).eq("user_id",userId).not("ended_at","is",null).order("started_at",{ascending:false}).range((page-1)*PAGE_SIZE,page*PAGE_SIZE-1);
  if (goal !== "all") query=query.eq("goal_id",goal); if(range!=="all") query=query.gte("started_at",approximateRangeStart(Number(range)));
  const [{ data: goals }, { data: profile }, { data: stats },{data:sessions,count,error}] = await Promise.all([supabase.from("study_goals").select("id,name,is_archived,daily_target_minutes,weekly_target_minutes").eq("user_id",userId),supabase.from("profiles").select("timezone").eq("id",userId).single(),supabase.rpc("get_personal_history_stats",{p_days:range === "all" ? null as unknown as number : Number(range)}),query]); if(error) console.error("History lookup failed",{code:error.code}); const names=new Map((goals??[]).map(g=>[g.id,g.name]));
  return <AppShell><div className="space-y-9"><PageHeading title="History" description="Your study record, personal pace, and the patterns taking shape over time."/><HistoryView goals={goals??[]} page={page} pageCount={Math.max(1,Math.ceil((count??0)/PAGE_SIZE))} range={range} selectedGoal={goal} sessions={(sessions??[]).map(s=>({...s,goalName:s.goal_id?names.get(s.goal_id)??"Archived goal":"Study session"}))} stats={stats} timezone={profile?.timezone??"UTC"}/></div></AppShell>;
}
