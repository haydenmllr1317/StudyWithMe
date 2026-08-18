import { formatDuration } from "@/lib/sessions/format";
import type { AnalyticsData } from "@/lib/analytics";

const hours = (seconds: number) => `${(seconds / 3600).toFixed(1)}h`;

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

function DailyLine({ data, subject }: { data: AnalyticsData; subject: string }) {
  const width = 390, height = 230, top = 16, bottom = 38, left = 42, right = 8;
  const innerWidth = width - left - right, innerHeight = height - top - bottom;
  const max = Math.max(3600, ...data.daily.map((point) => point.seconds));
  const points = data.daily.map((point, index) => ({ ...point, x: left + (data.daily.length === 1 ? innerWidth / 2 : index / (data.daily.length - 1) * innerWidth), y: top + innerHeight - point.seconds / max * innerHeight }));
  const labelIndexes = new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]);
  const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const path = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  return <section aria-labelledby={`${subject}-daily`}>
    <h2 className="text-xl font-semibold text-ink" id={`${subject}-daily`}>Daily study hours</h2>
    {points.length ? <>
      <div className="mt-5 overflow-hidden">
        <svg aria-hidden="true" className="h-auto w-full" role="img" viewBox={`0 0 ${width} ${height}`}>
          {[0, .5, 1].map((ratio) => <g key={ratio}><line stroke="#DDD9CF" strokeWidth="1" x1={left} x2={width - right} y1={top + innerHeight * ratio} y2={top + innerHeight * ratio}/><text fill="#68736E" fontSize="11" textAnchor="end" x={left - 8} y={top + innerHeight * ratio + 4}>{hours(max * (1 - ratio))}</text></g>)}
          <path d={path} fill="none" stroke="#648571" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
          {points.map((point, index) => <g key={point.date}>{(points.length <= 90 || labelIndexes.has(index)) && <circle cx={point.x} cy={point.y} fill="#FBF8F1" r="3.5" stroke="#466655" strokeWidth="2"><title>{point.date}: {hours(point.seconds)}</title></circle>}{labelIndexes.has(index) && <text fill="#68736E" fontSize="11" textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"} x={point.x} y={height - 9}>{date.format(new Date(`${point.date}T00:00:00Z`))}</text>}</g>)}
        </svg>
      </div>
      <details className="mt-3 text-sm text-muted"><summary className="min-h-11 cursor-pointer py-3 font-semibold text-ink">Daily values</summary><ul className="grid gap-x-6 border-t border-line sm:grid-cols-2">{(data.daily.length > 180 ? data.daily.filter((point) => point.seconds > 0) : data.daily).map((point) => <li className="flex justify-between border-b border-line py-2" key={point.date}><span>{date.format(new Date(`${point.date}T00:00:00Z`))}</span><span className="tabular">{formatDuration(point.seconds)}</span></li>)}</ul>{data.daily.length > 180 && <p className="mt-3 text-xs">For longer ranges, this table lists studied days; zero-study days remain represented in the line.</p>}</details>
    </> : <p className="mt-5 text-sm text-muted">No calendar days are available yet.</p>}
  </section>;
}

export function AnalyticsCharts({ data, subject }: { data: AnalyticsData; subject: "personal" | "community" }) {
  const leading = data.goals[0];
  const summary = subject === "personal" ? `You studied ${formatDuration(data.totalSeconds)}. ${leading ? `${leading.name} accounted for ${formatDuration(leading.seconds)}.` : "No study time was recorded."}` : `This study population completed ${formatDuration(data.totalSeconds)}. ${leading ? `${leading.name} accounted for ${formatDuration(leading.seconds)}.` : "No study time was recorded."}`;
  return <div className="space-y-12"><p className="sr-only">{summary}</p><GoalBars data={data} subject={subject}/><DailyLine data={data} subject={subject}/></div>;
}
