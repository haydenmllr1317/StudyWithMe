import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import type { LeaderboardData } from "@/lib/leaderboard";
import { formatDuration } from "@/lib/sessions/format";

export function LeaderboardPreview({ data, error = false }: { data: LeaderboardData | null; error?: boolean }) {
  const current = data?.currentUser;
  return <div className="lg:border-l lg:border-line lg:pl-10">
    <h2 className="text-xl font-semibold tracking-[-0.025em] text-ink">Studying alongside you</h2>
    <p className="mt-2 text-sm leading-6 text-muted">This week’s shared pace, with private session details kept private.</p>
    {error ? <p className="mt-5 border-y border-line py-4 text-sm text-muted" role="status">Weekly pace is unavailable right now. Open Activity to try again.</p> : data?.top.length ? <ol className="mt-5 border-t border-line">{data.top.slice(0, 3).map((entry) => <li className={`grid grid-cols-[2rem_2.25rem_1fr_auto] items-center gap-2 border-b border-line py-3 ${entry.isCurrentUser ? "bg-coral-soft/35" : ""}`} key={entry.username}><span className="text-xs font-semibold tabular text-muted">{entry.rank}</span><Avatar avatarPath={entry.avatarPath} displayName={entry.displayName} size="sm"/><span className="min-w-0"><strong className="block truncate text-sm text-ink">{entry.displayName}{entry.isCurrentUser ? " · You" : ""}</strong><span className="block truncate text-xs text-muted">@{entry.username}</span></span><strong className="text-sm tabular text-ink">{formatDuration(entry.durationSeconds)}</strong></li>)}</ol> : <p className="mt-5 border-y border-line py-4 text-sm text-muted">No completed study time this week yet.</p>}
    {current && !current.includedInTop && <p className="mt-3 text-xs text-muted">{current.rank ? `You are #${current.rank} with ${formatDuration(current.durationSeconds)}.` : "Complete a session to join this week’s pace."}</p>}
    <Link className="mt-4 inline-block text-sm font-semibold text-coral underline decoration-coral/30 underline-offset-4 hover:decoration-coral" href="/activity?scope=everyone">Open Activity</Link>
  </div>;
}
