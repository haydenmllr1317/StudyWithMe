import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import {
  leaderboardPeriodLabel,
  leaderboardPeriods,
  type LeaderboardData,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from "@/lib/leaderboard";
import { formatDuration } from "@/lib/sessions/format";

function LeaderRow({ entry }: { entry: LeaderboardEntry }) {
  return <li className={`grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-4 sm:grid-cols-[4rem_minmax(0,1fr)_8rem] sm:gap-4 ${entry.isCurrentUser ? "bg-coral-soft/35" : ""}`}>
    <span className="pl-1 text-sm font-semibold tabular text-muted sm:pl-0"><span className="sr-only">Rank </span>{entry.rank}</span>
    <span className="flex min-w-0 items-center gap-3"><Avatar className={entry.isCurrentUser ? "bg-coral text-surface" : ""} displayName={entry.displayName} size="sm" /><span className="min-w-0"><span className="flex items-center gap-2"><strong className="truncate text-sm text-ink">{entry.displayName}</strong>{entry.isCurrentUser && <span className="text-xs font-semibold text-coral-dark">You</span>}</span><span className="block truncate text-xs text-muted">@{entry.username}</span></span></span>
    <strong aria-label={`${formatDuration(entry.durationSeconds)} studied`} className="text-right text-base tabular text-ink sm:text-sm">{formatDuration(entry.durationSeconds)}</strong>
  </li>;
}

export function LeaderboardView({ data, period, error }: { data: LeaderboardData | null; period: LeaderboardPeriod; error?: boolean }) {
  const current = data?.currentUser;
  return <div className="space-y-8">
    <nav aria-label="Leaderboard period" className="overflow-x-auto border-b border-line">
      <div className="flex min-w-max">{leaderboardPeriods.map((item) => <Link aria-current={period === item ? "page" : undefined} className={`relative grid min-h-12 place-items-center px-4 text-sm font-semibold transition-colors ${period === item ? "text-ink" : "text-muted hover:text-ink"}`} href={`/leaderboard?period=${item}`} key={item}>{leaderboardPeriodLabel(item)}{period === item && <span aria-hidden="true" className="absolute inset-x-2 bottom-[-1px] h-0.5 bg-coral" />}</Link>)}</div>
    </nav>

    {error ? <div className="border-y border-line py-8" role="alert"><h2 className="font-semibold text-ink">The leaderboard could not be loaded.</h2><p className="mt-2 text-sm text-muted">Refresh the page to try again. Your study data is still safe.</p></div> : data && data.top.length ? <>
      <div className="flex items-end justify-between gap-5"><div><h2 className="text-xl font-semibold tracking-[-0.025em] text-ink">{leaderboardPeriodLabel(period)} pace</h2><p className="mt-1 text-sm text-muted">{data.totalParticipants} {data.totalParticipants === 1 ? "learner has" : "learners have"} completed study time.</p></div><p className="hidden max-w-xs text-right text-xs leading-5 text-muted sm:block">Calendar boundaries follow your {data.timezone.replaceAll("_", " ")} timezone.</p></div>
      <div className="border-t border-line"><div className="hidden grid-cols-[4rem_1fr_8rem] gap-4 border-b border-line py-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted sm:grid"><span>Rank</span><span>Learner</span><span className="text-right">Studied</span></div><ol>{data.top.map((entry) => <LeaderRow entry={entry} key={entry.username} />)}</ol></div>
      {current && !current.includedInTop && <section className="border-y border-line py-5" aria-label="Your leaderboard position"><p className="measure-label">Your position</p><p className="mt-2 text-lg font-semibold text-ink">{current.rank ? <>You are #{current.rank} <span className="font-normal text-muted">with {formatDuration(current.durationSeconds)}</span></> : <>No rank yet <span className="font-normal text-muted">— complete a session to join.</span></>}</p></section>}
    </> : <div className="border-y border-line py-10"><h2 className="text-lg font-semibold text-ink">No completed study time yet.</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted">Finish a session and this {period === "all" ? "leaderboard" : period} view will begin to take shape.</p><Link className="mt-5 inline-block text-sm font-semibold text-coral underline decoration-coral/30 underline-offset-4 hover:decoration-coral" href="/">Start from Today</Link></div>}
    <p className="text-xs leading-5 text-muted">Only completed positive-duration sessions count. Individual sessions, timestamps, goals, notes, and ratings are never shown here.</p>
  </div>;
}
