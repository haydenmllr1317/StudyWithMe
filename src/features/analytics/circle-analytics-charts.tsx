import { formatDuration } from "@/lib/sessions/format";
import type { AnalyticsData } from "@/lib/analytics";

const colors = ["#D86148", "#466655", "#477A8B", "#8A6E9E", "#9A6B32", "#2F7D70", "#A34F6A", "#65728F"];
const axisHours = (seconds: number) => seconds === 0 ? "0h" : `${(seconds / 3600).toFixed(seconds < 3600 ? 1 : 0)}h`;

export function CircleAnalyticsCharts({ data }: { data: AnalyticsData }) {
  const maxTotal = Math.max(1, ...data.members.map((member) => member.durationSeconds));
  const width=720,height=300,top=18,bottom=44,left=50,right=12;
  const innerWidth=width-left-right,innerHeight=height-top-bottom;
  const maxDaily=Math.max(3600,...data.members.flatMap((member)=>member.daily.map((point)=>point.seconds)));
  const dates=data.members[0]?.daily.map((point)=>point.date)??[];
  const labelIndexes=new Set([0,Math.floor((dates.length-1)/2),dates.length-1]);
  const formatDate=new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",timeZone:"UTC"});
  const pathFor=(daily: typeof data.members[number]["daily"])=>daily.map((point,index)=>{
    const x=left+(daily.length===1?innerWidth/2:index/(daily.length-1)*innerWidth);
    const y=top+innerHeight-point.seconds/maxDaily*innerHeight;
    return `${index?"L":"M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return <div className="space-y-12">
    <section aria-labelledby="circle-breakdown"><div className="flex flex-wrap items-baseline justify-between gap-3"><h2 className="text-xl font-semibold text-ink" id="circle-breakdown">Study breakdown</h2><span className="text-sm tabular text-muted">{formatDuration(data.totalSeconds)} across the Circle</span></div>
      <div className="mt-6 space-y-5">{data.members.map((member,index)=><div key={member.userId}><div className="mb-2 flex min-w-0 items-baseline justify-between gap-4"><span className="truncate text-sm font-semibold text-ink">{member.displayName}{member.isCurrentUser?" · You":""}</span><span className="shrink-0 text-sm tabular text-muted">{formatDuration(member.durationSeconds)}</span></div><div aria-label={`${member.displayName}: ${formatDuration(member.durationSeconds)}`} className="h-2.5 overflow-hidden rounded-full bg-line/70" role="img"><div className="h-full rounded-full" style={{backgroundColor:colors[index%colors.length],width:member.durationSeconds?`${Math.max(2,member.durationSeconds/maxTotal*100)}%`:"0%"}}/></div></div>)}</div>
    </section>
    <section aria-labelledby="circle-progress"><div className="flex flex-wrap items-baseline justify-between gap-3"><h2 className="text-xl font-semibold text-ink" id="circle-progress">Daily member progress</h2><span className="text-xs text-muted">Completed study time per day</span></div>
      {dates.length?<><ul aria-label="Chart legend" className="mt-5 flex flex-wrap gap-x-5 gap-y-3">{data.members.map((member,index)=><li className="flex min-w-0 items-center gap-2 text-xs text-muted" key={member.userId}><span aria-hidden="true" className="h-0.5 w-5" style={{backgroundColor:colors[index%colors.length]}}/><span className="max-w-40 truncate">{member.displayName}{member.isCurrentUser?" · You":""}</span></li>)}</ul><div className="mt-4 overflow-x-auto"><svg aria-label="Daily completed study time for each Circle member" className="min-w-[42rem]" role="img" viewBox={`0 0 ${width} ${height}`}>{[0,.5,1].map((ratio)=><g key={ratio}><line stroke="#DDD9CF" x1={left} x2={width-right} y1={top+innerHeight*ratio} y2={top+innerHeight*ratio}/><text fill="#68736E" fontSize="11" textAnchor="end" x={left-8} y={top+innerHeight*ratio+4}>{axisHours(maxDaily*(1-ratio))}</text></g>)}{data.members.map((member,index)=><path d={pathFor(member.daily)} fill="none" key={member.userId} stroke={colors[index%colors.length]} strokeLinecap="round" strokeLinejoin="round" strokeWidth={member.isCurrentUser?3.5:2.5}><title>{member.displayName}</title></path>)}{dates.map((date,index)=>labelIndexes.has(index)?<text fill="#68736E" fontSize="11" key={date} textAnchor={index===0?"start":index===dates.length-1?"end":"middle"} x={left+(dates.length===1?innerWidth/2:index/(dates.length-1)*innerWidth)} y={height-10}>{formatDate.format(new Date(`${date}T00:00:00Z`))}</text>:null)}</svg></div><details className="mt-2 text-sm text-muted"><summary className="min-h-11 cursor-pointer py-3 font-semibold text-ink">Member daily values</summary><div className="overflow-x-auto"><table className="w-full min-w-[36rem] border-collapse text-left text-xs"><thead><tr className="border-y border-line"><th className="py-3 pr-4 font-semibold text-ink">Date</th>{data.members.map(member=><th className="px-3 py-3 font-semibold text-ink" key={member.userId}>{member.displayName}</th>)}</tr></thead><tbody>{dates.map((date,index)=><tr className="border-b border-line" key={date}><th className="py-3 pr-4 font-normal">{formatDate.format(new Date(`${date}T00:00:00Z`))}</th>{data.members.map(member=><td className="px-3 py-3 tabular" key={member.userId}>{formatDuration(member.daily[index]?.seconds??0)}</td>)}</tr>)}</tbody></table></div></details></>:<p className="mt-5 text-sm text-muted">No calendar days are available yet.</p>}
    </section>
  </div>;
}
