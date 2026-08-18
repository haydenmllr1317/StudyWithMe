import { formatDuration } from "@/lib/sessions/format";
import type { AnalyticsData } from "@/lib/analytics";
import { InteractiveDailyChart } from "@/features/analytics/interactive-daily-chart";

function GoalBars({ data, subject }: { data: AnalyticsData; subject: string }) {
  const max = Math.max(1, ...data.goals.map((goal) => goal.seconds));
  return <section aria-labelledby={`${subject}-breakdown`}>
    <div className="flex items-baseline justify-between gap-4"><h2 className="text-xl font-semibold text-ink" id={`${subject}-breakdown`}>Study breakdown</h2><span className="text-sm tabular text-muted">{formatDuration(data.totalSeconds)} total</span></div>
    {data.goals.length ? <div className="mt-6 space-y-5">{data.goals.map((goal, index) => <div key={goal.name}>
      <div className="mb-2 flex items-baseline justify-between gap-4"><span className="truncate text-sm font-semibold text-ink">{goal.name}</span><span className="shrink-0 text-sm tabular text-muted">{formatDuration(goal.seconds)}</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-line/70"><div className={`h-full rounded-full ${index % 3 === 0 ? "bg-coral" : index % 3 === 1 ? "bg-moss" : "bg-sky"}`} style={{ width: `${Math.max(2, goal.seconds / max * 100)}%` }} /></div>
    </div>)}</div> : <p className="mt-5 text-sm text-muted">No completed study time in this timeframe.</p>}
  </section>;
}

function DailyLine({data,subject}:{data:AnalyticsData;subject:string}){return <section aria-labelledby={`${subject}-daily`}><h2 className="text-xl font-semibold text-ink" id={`${subject}-daily`}>Daily study hours</h2>{data.daily.length?<InteractiveDailyChart ariaLabel="Your completed study time by day" series={[{id:"you",name:"You",color:"#466655",points:data.daily}]}/>:<p className="mt-5 text-sm text-muted">No calendar days are available yet.</p>}</section>}

export function AnalyticsCharts({ data, subject }: { data: AnalyticsData; subject: "personal" | "community" }) {
  const leading = data.goals[0];
  const summary = subject === "personal" ? `You studied ${formatDuration(data.totalSeconds)}. ${leading ? `${leading.name} accounted for ${formatDuration(leading.seconds)}.` : "No study time was recorded."}` : `This study population completed ${formatDuration(data.totalSeconds)}. ${leading ? `${leading.name} accounted for ${formatDuration(leading.seconds)}.` : "No study time was recorded."}`;
  return <div className="space-y-12"><p className="sr-only">{summary}</p><GoalBars data={data} subject={subject}/><DailyLine data={data} subject={subject}/></div>;
}
