import Link from "next/link";
/* eslint-disable @next/next/no-img-element */
import { Avatar } from "@/components/ui/avatar";
import { LoveButton } from "@/features/activity/love-button";
import type { ActivityFeed as ActivityFeedData, ActivityScope } from "@/lib/activity";
import { formatDuration } from "@/lib/sessions/format";

function emptyState(scope: ActivityScope) {
  if (scope === "mine") return {
    title: "No completed sessions yet.",
    copy: "Your finished study sessions will collect here.",
    action: <Link className="mt-4 inline-block text-sm font-semibold text-coral underline underline-offset-4" href="/today">Start from Today</Link>,
  };
  if (scope === "all_circles") return {
    title: "No Circle activity yet.",
    copy: "Join a Circle with an invitation to see shared study progress here.",
    action: <Link className="mt-4 inline-block text-sm font-semibold text-coral underline underline-offset-4" href="/leaderboard">View your Circles</Link>,
  };
  return {
    title: "This Circle is quiet for now.",
    copy: "Completed sessions will appear as Circle members study.",
    action: null,
  };
}

export function ActivityFeed({ data, scope }: { data: ActivityFeedData; scope: ActivityScope }) {
  if (!data.items.length) {
    const empty = emptyState(scope);
    return <div className="border-y border-line py-9"><h2 className="text-lg font-semibold text-ink">{empty.title}</h2><p className="mt-2 text-sm text-muted">{empty.copy}</p>{empty.action}</div>;
  }

  const date = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: data.timezone,
  });
  const next = data.nextCursor
    ? `/activity?scope=${encodeURIComponent(scope)}&before=${encodeURIComponent(data.nextCursor.endedAt)}&beforeId=${encodeURIComponent(data.nextCursor.id)}`
    : null;

  return <>
    <ol>
      {data.items.map((item) => <li className="scroll-mt-24 border-b border-line py-6 sm:py-7" id={`session-${item.id}`} key={item.id}>
        <article className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:gap-5">
          <Avatar className={item.isCurrentUser ? "bg-coral-soft text-coral-dark" : ""} displayName={item.displayName} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1"><h2 className="font-semibold text-ink">{item.displayName}{item.isCurrentUser ? " · You" : ""}</h2><span className="text-xs text-muted">@{item.username}</span></div>
            <p className="mt-2 text-base text-ink">Studied <strong>{item.goalName === "Study session" ? "Legacy session" : item.goalName}</strong></p>
            <p className="mt-1 text-xs text-muted">{date.format(new Date(item.completedAt))}{item.rating ? ` · Session Rating: ${item.rating}/5` : ""}</p>
            <p className="mt-1 flex flex-wrap gap-x-1 text-xs text-muted">{item.circles.length ? item.circles.map((circle,index)=><span key={circle.id}>{index>0&&<span aria-hidden="true">· </span>}<Link className="font-medium underline decoration-line underline-offset-2 hover:text-ink" href={`/groups/${circle.id}`}>{circle.name}</Link></span>) : "Only Me"}</p>
            {item.sharedNotes && <div className="mt-4 max-w-2xl"><p className="text-sm leading-6 text-ink">{item.sharedNotes}</p></div>}
            {item.reflectionPhotoUrl && <img alt={`${item.displayName}’s shared study reflection`} className="mt-4 max-h-[28rem] w-full max-w-2xl rounded-field object-cover" loading="lazy" src={item.reflectionPhotoUrl}/>}
            <div className="mt-3"><LoveButton canLove={item.canLove} count={item.loveCount} initiallyLoved={item.isLoved} sessionId={item.id}/></div>
          </div>
          <strong className="col-start-2 row-start-2 self-start text-lg tabular text-ink sm:col-start-3 sm:row-start-1 sm:text-base">{formatDuration(item.durationSeconds)}</strong>
        </article>
      </li>)}
    </ol>
    {next && <nav aria-label="Activity pages" className="mt-6 flex justify-end"><Link className="inline-flex min-h-11 items-center text-sm font-semibold text-coral underline underline-offset-4" href={next}>Older activity</Link></nav>}
  </>;
}
