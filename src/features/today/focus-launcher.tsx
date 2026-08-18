"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { finishSessionAction, pauseSessionAction, resumeSessionAction, startSessionAction, type SessionActionState } from "@/app/session-actions";
import { Button } from "@/components/ui/button";
import { formatClock, formatDuration } from "@/lib/sessions/format";
import { ReflectionForm } from "@/features/sessions/reflection-form";
import type { Tables } from "@/types/database";
import type { GroupSummary } from "@/lib/groups";

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
      <fieldset><legend className="text-sm font-semibold text-ink">Session style</legend><div className="mt-2 grid grid-cols-2 rounded-field border border-line bg-white p-1 shadow-[0_2px_10px_rgba(37,49,45,0.04)]"><label className={`cursor-pointer rounded-md px-3 py-2 text-center text-sm font-semibold transition-colors ${sessionType === "normal" ? "bg-moss-soft text-moss-dark" : "text-muted hover:bg-paper hover:text-ink"}`}><input checked={sessionType === "normal"} className="sr-only" name="sessionType" onChange={() => setSessionType("normal")} type="radio" value="normal" />Open timer</label><label className={`cursor-pointer rounded-md px-3 py-2 text-center text-sm font-semibold transition-colors ${sessionType === "pomodoro" ? "bg-moss-soft text-moss-dark" : "text-muted hover:bg-paper hover:text-ink"}`}><input checked={sessionType === "pomodoro"} className="sr-only" name="sessionType" onChange={() => setSessionType("pomodoro")} type="radio" value="pomodoro" />Pomodoro</label></div></fieldset>
    </div>
    {sessionType === "pomodoro" && <label className="mt-5 block max-w-xs text-sm font-semibold text-ink">Focus length<select className="field mt-2" name="pomodoroMinutes" onChange={(event) => setPomodoroMinutes(Number(event.target.value) as 25 | 50)} value={pomodoroMinutes}><option value="25">25 minutes</option><option value="50">50 minutes</option></select></label>}
    <StartButton detail={`${goals.find((goal) => goal.id === goalId)?.name} · ${sessionType === "normal" ? "Open timer" : `${pomodoroMinutes} minute focus`}`} />
    {state.message && <p aria-live="polite" className={`mt-3 text-sm ${state.status === "error" ? "text-coral-dark" : "text-moss-dark"}`}>{state.message}</p>}
  </form>;
}

function Reflection({ session, goalName, durationSeconds, circles, onDone }: { session: Tables<"study_sessions">; goalName: string; durationSeconds: number; circles: GroupSummary[]; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  async function skip() {
    setPending(true);
    setError(undefined);
    const formData = new FormData();
    formData.set("sessionId", session.id);
    const result = await finishSessionAction(initialSessionActionState, formData);
    if (result.status === "error") {
      setError(result.message ?? "The session could not be finished.");
      setPending(false);
      return;
    }
    onDone();
  }
  return <section aria-labelledby="reflection-heading" className="border-y border-line py-7"><p className="measure-label">Finish session</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink" id="reflection-heading">{formatDuration(durationSeconds)} with {goalName}</h2><ReflectionForm circles={circles} finishBeforeSave onSaved={onDone} sessionId={session.id} showAudience/><button className="mt-3 min-h-11 text-sm font-semibold text-muted hover:text-ink disabled:opacity-50" disabled={pending} onClick={skip} type="button">{pending ? "Finishing…" : "Skip reflection"}</button>{error && <p aria-live="polite" className="mt-3 text-sm text-coral-dark">{error}</p>}</section>;
}

function ActivePanel({ session, circles }: { session: ActiveSession; circles: GroupSummary[] }) {
  const router = useRouter();
  const [now, setNow] = useState(0);
  const [reflectionSession, setReflectionSession] = useState<Tables<"study_sessions"> | null>(null);
  const [stopping, setStopping] = useState(false);
  const [stopError, setStopError] = useState<string>();
  const [pauseState, pauseAction] = useActionState(session.paused_at ? resumeSessionAction : pauseSessionAction, initialSessionActionState);
  useEffect(() => { const update = () => setNow(Date.now()); const timer = window.setInterval(update, 1000); document.addEventListener("visibilitychange", update); return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", update); }; }, []);

  const effectiveNow = session.paused_at ? new Date(session.paused_at).getTime() : now;
  const elapsed = Math.max(0, Math.floor((effectiveNow - new Date(session.started_at).getTime()) / 1000) - session.paused_seconds);
  if (reflectionSession) {
    const stoppedAt = reflectionSession.paused_at ? new Date(reflectionSession.paused_at).getTime() : now;
    const stoppedDuration = Math.max(0, Math.floor((stoppedAt - new Date(reflectionSession.started_at).getTime()) / 1000) - reflectionSession.paused_seconds);
    return <Reflection circles={circles} durationSeconds={stoppedDuration} goalName={session.goalName} onDone={() => router.refresh()} session={reflectionSession} />;
  }
  async function openReflection() {
    setStopping(true);
    setStopError(undefined);
    if (session.paused_at) {
      setReflectionSession(session);
      setStopping(false);
      return;
    }
    const formData = new FormData();
    formData.set("sessionId", session.id);
    const result = await pauseSessionAction(initialSessionActionState, formData);
    if (result.status === "error" || !result.session) {
      setStopError(result.message ?? "The reflection step could not be opened. Try again.");
    } else {
      setReflectionSession(result.session);
    }
    setStopping(false);
  }
  const remaining = Math.max(0, (session.pomodoro_minutes ?? 25) * 60 - elapsed);
  const pomodoroComplete = session.session_type === "pomodoro" && remaining === 0;
  const display = session.session_type === "pomodoro" ? formatClock(remaining) : formatClock(elapsed);
  return <section aria-labelledby="active-session-heading" className="border-y border-line py-8 sm:py-10"><div className="flex items-start justify-between gap-5"><div><p className="measure-label">{session.paused_at ? "Session paused" : pomodoroComplete ? "Focus interval complete" : "Studying now"}</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-ink" id="active-session-heading">{session.goalName}</h2><p className="mt-1 text-sm text-muted">{session.session_type === "pomodoro" ? `${session.pomodoro_minutes ?? 25} minute Pomodoro` : "Open study session"}</p></div><span className={`mt-1 size-3 shrink-0 rounded-full ${session.paused_at ? "bg-line" : pomodoroComplete ? "bg-moss" : "bg-coral"}`}><span className="sr-only">{session.paused_at ? "Session paused" : pomodoroComplete ? "Focus interval complete" : "Session active"}</span></span></div><p aria-label={session.session_type === "pomodoro" ? `${remaining} seconds remaining` : `${elapsed} seconds elapsed`} className="mt-9 text-[4.25rem] font-semibold leading-none tracking-[-0.04em] tabular text-ink sm:text-8xl">{display}</p><p className="mt-3 text-sm text-muted">{session.paused_at ? "Paused time is not counted toward this session." : pomodoroComplete ? `Your ${session.pomodoro_minutes ?? 25} minutes are complete. Finish when you’re ready.` : session.session_type === "pomodoro" ? "Remaining focus time" : "Elapsed study time"}</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><form action={pauseAction}><input name="sessionId" type="hidden" value={session.id} /><PendingButton className="w-full sm:w-auto">{session.paused_at ? "Resume Session" : "Pause Session"}</PendingButton></form><button className="min-h-12 w-full rounded-field border border-ink px-5 text-sm font-semibold text-ink hover:bg-ink hover:text-white disabled:cursor-wait disabled:opacity-60 sm:w-auto" disabled={stopping} onClick={openReflection} type="button">{stopping ? "Opening reflection…" : "Stop and Finish"}</button></div>{pauseState.message && <p aria-live="polite" className={`mt-3 text-sm ${pauseState.status === "error" ? "text-coral-dark" : "text-moss-dark"}`}>{pauseState.message}</p>}{stopError && <p aria-live="polite" className="mt-3 max-w-xl text-sm text-coral-dark">{stopError}</p>}</section>;
}

export function FocusLauncher({ activeSession, goals, circles }: { activeSession: ActiveSession | null; goals: GoalOption[]; circles: GroupSummary[] }) {
  return activeSession ? <ActivePanel circles={circles} session={activeSession} /> : <StartPanel goals={goals} />;
}
