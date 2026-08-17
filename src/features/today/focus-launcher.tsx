"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { finishSessionAction, pauseSessionAction, resumeSessionAction, saveReflectionAction, startSessionAction, type SessionActionState } from "@/app/session-actions";
import { Button } from "@/components/ui/button";
import { formatClock, formatDuration } from "@/lib/sessions/format";
import type { Tables } from "@/types/database";

type GoalOption = Pick<Tables<"study_goals">, "id" | "name">;
type ActiveSession = Tables<"study_sessions"> & { goalName: string };
const initialSessionActionState: SessionActionState = { status: "idle" };

function PendingButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <Button className={className} disabled={pending} type="submit">{pending ? "Working…" : children}</Button>;
}

function StartButton({ detail }: { detail: string }) {
  const { pending } = useFormStatus();
  return <button className="group mt-6 flex min-h-20 w-full items-center justify-between bg-coral px-5 text-left text-white transition-colors duration-200 ease-out hover:bg-coral-dark disabled:cursor-not-allowed disabled:bg-line disabled:text-muted sm:min-h-24 sm:px-7" disabled={pending} type="submit"><span><span className="block text-lg font-semibold tracking-[-0.02em] sm:text-xl">{pending ? "Starting Session…" : "Start Study Session"}</span><span className="mt-1 block text-xs text-white/80 sm:text-sm">{detail}</span></span><span aria-hidden="true" className="text-2xl transition-transform group-hover:translate-x-1">→</span></button>;
}

function StartPanel({ goals }: { goals: GoalOption[] }) {
  const [state, action] = useActionState(startSessionAction, initialSessionActionState);
  const [goalId, setGoalId] = useState(goals[0]?.id ?? "");
  const [sessionType, setSessionType] = useState<"normal" | "pomodoro">("normal");
  const [pomodoroMinutes, setPomodoroMinutes] = useState<25 | 50>(25);
  if (!goals.length) return <div className="flex min-h-24 w-full flex-col justify-center bg-coral-soft px-5 sm:px-7"><p className="text-lg font-semibold tracking-[-0.02em] text-ink">Your first session starts with a goal.</p><Link className="mt-2 w-fit text-sm font-semibold text-coral-dark underline decoration-coral/30 underline-offset-4" href="/profile">Create a study goal</Link></div>;

  return <form action={action} className="border-y border-line py-6 sm:py-8">
    <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(16rem,0.7fr)] sm:items-end">
      <label className="text-sm font-semibold text-ink">Study goal<select className="field mt-2" name="goalId" onChange={(event) => setGoalId(event.target.value)} required value={goalId}>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}</select></label>
      <fieldset><legend className="text-sm font-semibold text-ink">Session style</legend><div className="mt-2 grid grid-cols-2 border border-line bg-white p-1"><label className={`cursor-pointer px-3 py-2 text-center text-sm font-semibold transition-colors ${sessionType === "normal" ? "bg-ink text-white" : "text-muted hover:text-ink"}`}><input checked={sessionType === "normal"} className="sr-only" name="sessionType" onChange={() => setSessionType("normal")} type="radio" value="normal" />Open timer</label><label className={`cursor-pointer px-3 py-2 text-center text-sm font-semibold transition-colors ${sessionType === "pomodoro" ? "bg-ink text-white" : "text-muted hover:text-ink"}`}><input checked={sessionType === "pomodoro"} className="sr-only" name="sessionType" onChange={() => setSessionType("pomodoro")} type="radio" value="pomodoro" />Pomodoro</label></div></fieldset>
    </div>
    {sessionType === "pomodoro" && <label className="mt-5 block max-w-xs text-sm font-semibold text-ink">Focus length<select className="field mt-2" name="pomodoroMinutes" onChange={(event) => setPomodoroMinutes(Number(event.target.value) as 25 | 50)} value={pomodoroMinutes}><option value="25">25 minutes</option><option value="50">50 minutes</option></select></label>}
    <StartButton detail={`${goals.find((goal) => goal.id === goalId)?.name} · ${sessionType === "normal" ? "Open timer" : `${pomodoroMinutes} minute focus`}`} />
    {state.message && <p aria-live="polite" className={`mt-3 text-sm ${state.status === "error" ? "text-coral-dark" : "text-moss-dark"}`}>{state.message}</p>}
  </form>;
}

function Reflection({ session, goalName, onDone }: { session: Tables<"study_sessions">; goalName: string; onDone: () => void }) {
  const [state, action] = useActionState(saveReflectionAction, initialSessionActionState);
  return <section aria-labelledby="reflection-heading" className="border-y border-line py-7"><p className="measure-label">Session complete</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink" id="reflection-heading">{formatDuration(session.duration_seconds ?? 0)} with {goalName}</h2><p className="mt-2 text-sm text-muted">The session is already saved. Add a reflection now, or leave it for later.</p><form action={action} className="mt-6"><input name="sessionId" type="hidden" value={session.id} /><label className="text-sm font-semibold text-ink">Notes <span className="font-normal text-muted">(optional)</span><textarea className="field mt-2 min-h-28 resize-y" maxLength={5000} name="notes" placeholder="What clicked? What will you return to?" /></label><label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 text-sm text-ink"><input className="mt-1 size-4 accent-coral" name="shareNotes" type="checkbox" /><span><span className="font-semibold">Share these notes with Activity</span><span className="mt-0.5 block text-xs leading-5 text-muted">Off by default. Your session still appears without the notes.</span></span></label><fieldset className="mt-5"><legend className="text-sm font-semibold text-ink">How did it feel? <span className="font-normal text-muted">(optional)</span></legend><div className="mt-2 flex flex-wrap gap-2">{[1, 2, 3, 4, 5].map((rating) => <label className="cursor-pointer" key={rating}><input className="peer sr-only" name="rating" type="radio" value={rating} /><span className="grid size-11 place-items-center rounded-full border border-line bg-white text-sm font-semibold text-muted peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white">{rating}</span></label>)}</div></fieldset><div className="mt-6 flex flex-wrap items-center gap-4"><PendingButton>Save reflection</PendingButton><button className="min-h-11 text-sm font-semibold text-muted hover:text-ink" onClick={onDone} type="button">Not now</button></div>{state.message && <p aria-live="polite" className={`mt-3 text-sm ${state.status === "error" ? "text-coral-dark" : "text-moss-dark"}`}>{state.message}</p>}</form></section>;
}

function ActivePanel({ session }: { session: ActiveSession }) {
  const router = useRouter();
  const [now, setNow] = useState(0);
  const [finishState, finishAction] = useActionState(finishSessionAction, initialSessionActionState);
  const [pauseState, pauseAction] = useActionState(session.paused_at ? resumeSessionAction : pauseSessionAction, initialSessionActionState);
  useEffect(() => { const update = () => setNow(Date.now()); const timer = window.setInterval(update, 1000); document.addEventListener("visibilitychange", update); return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", update); }; }, []);
  if (finishState.session) return <Reflection goalName={session.goalName} onDone={() => router.refresh()} session={finishState.session} />;

  const effectiveNow = session.paused_at ? new Date(session.paused_at).getTime() : now;
  const elapsed = Math.max(0, Math.floor((effectiveNow - new Date(session.started_at).getTime()) / 1000) - session.paused_seconds);
  const remaining = Math.max(0, (session.pomodoro_minutes ?? 25) * 60 - elapsed);
  const pomodoroComplete = session.session_type === "pomodoro" && remaining === 0;
  const display = session.session_type === "pomodoro" ? formatClock(remaining) : formatClock(elapsed);
  return <section aria-labelledby="active-session-heading" className="border-y border-line py-8 sm:py-10"><div className="flex items-start justify-between gap-5"><div><p className="measure-label">{session.paused_at ? "Session paused" : pomodoroComplete ? "Focus interval complete" : "Studying now"}</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-ink" id="active-session-heading">{session.goalName}</h2><p className="mt-1 text-sm text-muted">{session.session_type === "pomodoro" ? `${session.pomodoro_minutes ?? 25} minute Pomodoro` : "Open study session"}</p></div><span className={`mt-1 size-3 shrink-0 rounded-full ${session.paused_at ? "bg-line" : pomodoroComplete ? "bg-moss" : "bg-coral"}`}><span className="sr-only">{session.paused_at ? "Session paused" : pomodoroComplete ? "Focus interval complete" : "Session active"}</span></span></div><p aria-label={session.session_type === "pomodoro" ? `${remaining} seconds remaining` : `${elapsed} seconds elapsed`} className="mt-9 text-[4.25rem] font-semibold leading-none tracking-[-0.04em] tabular text-ink sm:text-8xl">{display}</p><p className="mt-3 text-sm text-muted">{session.paused_at ? "Paused time is not counted toward this session." : pomodoroComplete ? `Your ${session.pomodoro_minutes ?? 25} minutes are complete. Finish when you’re ready.` : session.session_type === "pomodoro" ? "Remaining focus time" : "Elapsed study time"}</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><form action={pauseAction}><input name="sessionId" type="hidden" value={session.id} /><PendingButton className="w-full sm:w-auto">{session.paused_at ? "Resume Session" : "Pause Session"}</PendingButton></form><form action={finishAction}><input name="sessionId" type="hidden" value={session.id} /><button className="min-h-12 w-full rounded-field border border-ink px-5 text-sm font-semibold text-ink hover:bg-ink hover:text-white sm:w-auto" type="submit">Stop and Finish</button></form></div>{pauseState.message && <p aria-live="polite" className={`mt-3 text-sm ${pauseState.status === "error" ? "text-coral-dark" : "text-moss-dark"}`}>{pauseState.message}</p>}{finishState.message && <p aria-live="polite" className={`mt-3 max-w-xl text-sm ${finishState.status === "error" ? "text-coral-dark" : "text-moss-dark"}`}>{finishState.message}</p>}</section>;
}

export function FocusLauncher({ activeSession, goals }: { activeSession: ActiveSession | null; goals: GoalOption[] }) {
  return activeSession ? <ActivePanel session={activeSession} /> : <StartPanel goals={goals} />;
}
