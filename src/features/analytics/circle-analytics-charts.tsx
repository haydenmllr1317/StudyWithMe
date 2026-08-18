import { formatDuration } from "@/lib/sessions/format";
import type { AnalyticsData } from "@/lib/analytics";
import { InteractiveDailyChart } from "@/features/analytics/interactive-daily-chart";

const colors = ["#D86148", "#466655", "#477A8B", "#8A6E9E", "#9A6B32", "#2F7D70", "#A34F6A", "#65728F"];

export function CircleAnalyticsCharts({ data }: { data: AnalyticsData }) {
  const maxTotal = Math.max(1, ...data.members.map((member) => member.durationSeconds));
  const dates=data.members[0]?.daily.map((point)=>point.date)??[];

  return <div className="space-y-12">
    <section aria-labelledby="circle-breakdown"><div className="flex flex-wrap items-baseline justify-between gap-3"><h2 className="text-xl font-semibold text-ink" id="circle-breakdown">Study breakdown</h2><span className="text-sm tabular text-muted">{formatDuration(data.totalSeconds)} across the Circle</span></div>
      <div className="mt-6 space-y-5">{data.members.map((member,index)=><div key={member.userId}><div className="mb-2 flex min-w-0 items-baseline justify-between gap-4"><span className="truncate text-sm font-semibold text-ink">{member.displayName}{member.isCurrentUser?" · You":""}</span><span className="shrink-0 text-sm tabular text-muted">{formatDuration(member.durationSeconds)}</span></div><div aria-label={`${member.displayName}: ${formatDuration(member.durationSeconds)}`} className="h-2.5 overflow-hidden rounded-full bg-line/70" role="img"><div className="h-full rounded-full" style={{backgroundColor:colors[index%colors.length],width:member.durationSeconds?`${Math.max(2,member.durationSeconds/maxTotal*100)}%`:"0%"}}/></div></div>)}</div>
    </section>
    <section aria-labelledby="circle-progress"><div className="flex flex-wrap items-baseline justify-between gap-3"><h2 className="text-xl font-semibold text-ink" id="circle-progress">Daily member progress</h2><span className="text-xs text-muted">Completed study time per day</span></div>
      {dates.length?<><ul aria-label="Chart legend" className="mt-5 flex flex-wrap gap-x-5 gap-y-3">{data.members.map((member,index)=><li className="flex min-w-0 items-center gap-2 text-xs text-muted" key={member.userId}><span aria-hidden="true" className="h-0.5 w-5" style={{backgroundColor:colors[index%colors.length]}}/><span className="max-w-40 truncate">{member.displayName}{member.isCurrentUser?" · You":""}</span></li>)}</ul><InteractiveDailyChart ariaLabel="Daily completed study time for each Circle member" series={data.members.map((member,index)=>({id:member.userId,name:`${member.displayName}${member.isCurrentUser?" · You":""}`,color:colors[index%colors.length],points:member.daily}))}/></>:<p className="mt-5 text-sm text-muted">No calendar days are available yet.</p>}
    </section>
  </div>;
}
