import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import type { ActivityFeed as ActivityFeedData, ActivityScope } from "@/lib/activity";
import { formatDuration } from "@/lib/sessions/format";

function emptyState(scope: ActivityScope) {
  if (scope === "mine") return {
    title: "No completed sessions yet.",
    copy: "Your finished study sessions will collect here.",
    action: <Link className="mt-4 inline-block text-sm font-semibold text-coral underline underline-offset-4" href="/today">Start from Today</Link>,
  };
  if (scope === "everyone") return {
    title: "No activity yet.",
    copy: "Completed study sessions will appear here as learners make progress.",
    action: null,
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
    <ol className="border-t border-line">
      {data.items.map((item) => <li className="border-b border-line py-6 sm:py-7" key={item.id}>
        <article className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:gap-5">
          <Avatar avatarPath={item.avatarPath} className={item.isCurrentUser ? "bg-coral-soft text-coral-dark" : ""} displayName={item.displayName} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1"><h2 className="font-semibold text-ink">{item.displayName}{item.isCurrentUser ? " · You" : ""}</h2><span className="text-xs text-muted">@{item.username}</span></div>
            <p className="mt-2 text-base text-ink">Studied <strong>{item.goalName}</strong></p>
            <p className="mt-1 text-xs text-muted">{date.format(new Date(item.completedAt))}{item.rating ? ` · ${item.rating}/5` : ""}</p>
            {item.sharedNotes && <div className="mt-4 max-w-2xl border-t border-line pt-4"><p className="text-sm leading-6 text-ink">{item.sharedNotes}</p></div>}
          </div>
          <strong className="col-start-2 row-start-2 self-start text-lg tabular text-ink sm:col-start-3 sm:row-start-1 sm:text-base">{formatDuration(item.durationSeconds)}</strong>
        </article>
      </li>)}
    </ol>
    {next && <nav aria-label="Activity pages" className="mt-6 flex justify-end"><Link className="inline-flex min-h-11 items-center text-sm font-semibold text-coral underline underline-offset-4" href={next}>Older activity</Link></nav>}
  </>;
}
