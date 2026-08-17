"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { deleteCompletedSessionAction, saveReflectionAction, type SessionActionState } from "@/app/session-actions";
import { Button } from "@/components/ui/button";
import { AnalyticsCharts } from "@/features/analytics/analytics-charts";
import { TimeframeSelector } from "@/features/analytics/timeframe-selector";
import type { AnalyticsData, AnalyticsRange } from "@/lib/analytics";
import { formatDuration } from "@/lib/sessions/format";
import type { Tables } from "@/types/database";

type Session = Tables<"study_sessions"> & { goalName: string };
type Goal = Pick<Tables<"study_goals">, "id" | "name" | "is_archived" | "daily_target_minutes" | "weekly_target_minutes">;
const initial: SessionActionState = { status: "idle" };

function SessionRow({ session, timezone }: { session: Session; timezone: string }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [editState, edit] = useActionState(saveReflectionAction, initial);
  const [deleteState, deleteAction] = useActionState(deleteCompletedSessionAction, initial);
  const current = editState.session ? { ...session, ...editState.session } : session;
  const date = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: timezone });

  return <li className="border-b border-line py-5">
    <button aria-expanded={open} className="grid min-h-12 w-full gap-2 text-left sm:grid-cols-[11rem_1fr_auto] sm:items-start sm:gap-6" onClick={() => setOpen(!open)}>
      <span className="text-xs text-muted">{date.format(new Date(current.started_at))}</span>
      <span><strong className="block text-sm text-ink">{current.goalName}</strong><span className="mt-1 block text-xs text-muted">{current.session_type === "pomodoro" ? "Pomodoro" : "Normal"}{current.rating ? ` · ${current.rating}/5` : ""}</span></span>
      <strong className="text-xl tabular text-ink">{formatDuration(current.duration_seconds ?? 0)}</strong>
    </button>
    {open && <div className="mt-5 border-t border-line pt-5 sm:ml-[13rem]">
      <p className="text-sm text-muted">{current.notes || "No session note."}</p>
      <form action={edit} className="mt-5">
        <input name="sessionId" type="hidden" value={current.id} />
        <label className="text-sm font-semibold text-ink">Notes<textarea className="field mt-2 min-h-24" defaultValue={current.notes ?? ""} key={current.updated_at} maxLength={5000} name="notes" /></label>
        <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 text-sm text-ink"><input className="mt-1 size-4 accent-coral" defaultChecked={current.share_notes} key={`share-${current.updated_at}`} name="shareNotes" type="checkbox" /><span><span className="font-semibold">Share these notes with Activity</span><span className="mt-0.5 block text-xs leading-5 text-muted">Your notes remain private when this is off.</span></span></label>
        <label className="mt-4 block text-sm font-semibold text-ink">Rating<select className="field mt-2" defaultValue={current.rating ?? ""} key={`rating-${current.updated_at}`} name="rating"><option value="">No rating</option>{[1, 2, 3, 4, 5].map((rating) => <option key={rating}>{rating}</option>)}</select></label>
        <div className="mt-4 flex flex-wrap gap-4"><Button type="submit">Save reflection</Button><button className="min-h-11 text-sm text-muted underline" onClick={() => setConfirm(true)} type="button">Delete session</button></div>
        {editState.message && <p aria-live="polite" className={`mt-2 text-sm ${editState.status === "error" ? "text-coral-dark" : "text-moss-dark"}`}>{editState.message}</p>}
      </form>
      {confirm && <form action={deleteAction} className="mt-4 border-t border-line pt-4"><input name="sessionId" type="hidden" value={current.id} /><p className="text-sm text-coral-dark">Delete permanently? Today totals, streaks, and Activity will change.</p><div className="mt-3 flex flex-wrap gap-4"><Button type="submit">Yes, delete</Button><button className="min-h-11" onClick={() => setConfirm(false)} type="button">Cancel</button></div>{deleteState.message && <p aria-live="polite" className="mt-2 text-sm text-coral-dark">{deleteState.message}</p>}</form>}
    </div>}
  </li>;
}

export function HistoryView({ sessions, goals, analytics, timezone, range, selectedGoal, page, pageCount, error }: { sessions: Session[]; goals: Goal[]; analytics: AnalyticsData | null; timezone: string; range: AnalyticsRange; selectedGoal: string; page: number; pageCount: number; error: boolean }) {
  const query = (targetPage: number) => `?range=${range}&goal=${selectedGoal}&page=${targetPage}`;
  return <div className="space-y-12">
    {error && <div className="border-y border-line py-5" role="alert"><p className="font-semibold text-ink">Some history information is unavailable.</p><p className="mt-1 text-sm text-muted">Check your connection and refresh this page. Any study data already saved is safe.</p></div>}
    <TimeframeSelector hrefFor={(item) => `?range=${item}&goal=${selectedGoal}`} range={range}/>
    {analytics && <AnalyticsCharts data={analytics} subject="personal" />}
    <form className="grid gap-4 border-t border-line pt-8 sm:grid-cols-[1fr_auto] sm:items-end" method="get"><input name="range" type="hidden" value={range}/><label className="text-sm font-semibold">Filter sessions by goal<select className="field mt-2" defaultValue={selectedGoal} name="goal"><option value="all">All goals</option>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}{goal.is_archived ? " (archived)" : ""}</option>)}</select></label><Button type="submit">Apply filter</Button></form>
    <section><h2 className="text-xl font-semibold text-ink">Sessions</h2>{sessions.length ? <ol className="mt-4 border-t border-line">{sessions.map((session) => <SessionRow key={session.id} session={session} timezone={timezone} />)}</ol> : <div className="mt-4 border-y border-line py-8"><p className="font-semibold">No sessions in this view.</p><p className="mt-2 text-sm text-muted">Adjust the filters or begin a session from Today.</p></div>}<nav aria-label="Session pages" className="mt-6 flex justify-between"><span>{page > 1 ? <Link href={query(page - 1)}>Previous</Link> : null}</span><span className="text-sm text-muted">Page {page} of {pageCount}</span><span>{page < pageCount ? <Link href={query(page + 1)}>Next page</Link> : null}</span></nav></section>
  </div>;
}
