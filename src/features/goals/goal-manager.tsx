"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { archiveGoalAction, deleteGoalAction, restoreGoalAction, saveGoalAction, type GoalActionState } from "@/app/goal-actions";
import { Button } from "@/components/ui/button";
import { formatMinutes, splitMinutes } from "@/lib/goals/validation";
import type { Tables } from "@/types/database";

type Goal = Tables<"study_goals">;
const initialGoalActionState: GoalActionState = { status: "idle" };

function SubmitButton({ children, quiet = false }: { children: React.ReactNode; quiet?: boolean }) {
  const { pending } = useFormStatus();
  if (quiet) return <button className="min-h-10 text-sm font-semibold text-coral underline decoration-coral/30 underline-offset-4 hover:decoration-coral disabled:text-muted" disabled={pending} type="submit">{pending ? "Working…" : children}</button>;
  return <Button disabled={pending} type="submit">{pending ? "Saving…" : children}</Button>;
}

function Feedback({ state }: { state: GoalActionState }) {
  if (!state.message) return null;
  return <p aria-live="polite" className={`text-xs leading-5 ${state.status === "error" ? "text-coral-dark" : "text-moss-dark"}`}>{state.message}</p>;
}

function GoalForm({ goal, onDone }: { goal?: Goal; onDone: (saved?: Goal) => void }) {
  const [state, action] = useActionState(saveGoalAction, initialGoalActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const daily = splitMinutes(goal?.daily_target_minutes ?? null);
  const weekly = splitMinutes(goal?.weekly_target_minutes ?? null);
  useEffect(() => { if (state.status === "success") { formRef.current?.reset(); onDone(state.goal); } }, [state, onDone]);

  return <form action={action} className="mt-5 border-y border-line bg-white/60 px-4 py-5 sm:px-6" ref={formRef}>
    {goal && <input name="goalId" type="hidden" value={goal.id} />}
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-semibold text-ink sm:col-span-2">Goal name
        <input aria-describedby={state.fieldErrors?.name ? "goal-name-error" : undefined} className="field mt-2" defaultValue={goal?.name} maxLength={100} name="name" placeholder="e.g. Organic Chemistry" required />
        {state.fieldErrors?.name && <span className="mt-1 block text-xs font-normal text-coral-dark" id="goal-name-error">{state.fieldErrors.name}</span>}
      </label>
      <label className="text-sm font-semibold text-ink sm:col-span-2">Description <span className="font-normal text-muted">(optional)</span>
        <textarea className="field mt-2 min-h-24 resize-y" defaultValue={goal?.description ?? ""} maxLength={1000} name="description" placeholder="What are you working toward?" />
        {state.fieldErrors?.description && <span className="mt-1 block text-xs font-normal text-coral-dark">{state.fieldErrors.description}</span>}
      </label>
      <fieldset><legend className="text-sm font-semibold text-ink">Daily target <span className="font-normal text-muted">(optional)</span></legend><div className="mt-2 grid grid-cols-2 gap-3"><label className="text-xs text-muted"><input className="field mb-1" defaultValue={daily.hours} inputMode="numeric" min="0" name="dailyHours" type="number" />Hours</label><label className="text-xs text-muted"><input className="field mb-1" defaultValue={daily.minutes} inputMode="numeric" max="59" min="0" name="dailyMinutes" type="number" />Minutes</label></div>{state.fieldErrors?.dailyTarget && <p className="mt-1 text-xs text-coral-dark">{state.fieldErrors.dailyTarget}</p>}</fieldset>
      <fieldset><legend className="text-sm font-semibold text-ink">Weekly target <span className="font-normal text-muted">(optional)</span></legend><div className="mt-2 grid grid-cols-2 gap-3"><label className="text-xs text-muted"><input className="field mb-1" defaultValue={weekly.hours} inputMode="numeric" min="0" name="weeklyHours" type="number" />Hours</label><label className="text-xs text-muted"><input className="field mb-1" defaultValue={weekly.minutes} inputMode="numeric" max="59" min="0" name="weeklyMinutes" type="number" />Minutes</label></div>{state.fieldErrors?.weeklyTarget && <p className="mt-1 text-xs text-coral-dark">{state.fieldErrors.weeklyTarget}</p>}</fieldset>
    </div>
    <div className="mt-6 flex flex-wrap items-center gap-4"><SubmitButton>{goal ? "Save changes" : "Create goal"}</SubmitButton><button className="min-h-10 text-sm font-semibold text-muted hover:text-ink" onClick={() => onDone()} type="button">Cancel</button><Feedback state={state} /></div>
  </form>;
}

function GoalRow({ goal, onSaved }: { goal: Goal; onSaved: (goal: Goal) => void }) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [archiveState, archiveAction] = useActionState(goal.is_archived ? restoreGoalAction : archiveGoalAction, initialGoalActionState);
  const [deleteState, deleteAction] = useActionState(deleteGoalAction, initialGoalActionState);
  useEffect(() => { if (archiveState.status === "success" && archiveState.goal) onSaved(archiveState.goal); }, [archiveState, onSaved]);
  return <div className="border-b border-line py-5">
    <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
      <div><h3 className="text-base font-semibold tracking-[-0.015em] text-ink">{goal.name}</h3>{goal.description && <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{goal.description}</p>}<p className="mt-3 text-xs text-muted">Daily {formatMinutes(goal.daily_target_minutes)} · Weekly {formatMinutes(goal.weekly_target_minutes)}</p></div>
      <div className="flex flex-wrap items-center gap-x-4">
        {!goal.is_archived && <button className="min-h-10 text-sm font-semibold text-ink hover:text-coral" onClick={() => setEditing((value) => !value)} type="button">{editing ? "Close edit" : "Edit"}</button>}
        <form action={archiveAction}><input name="goalId" type="hidden" value={goal.id} /><SubmitButton quiet>{goal.is_archived ? "Restore" : "Archive"}</SubmitButton></form>
        {goal.is_archived && !confirmingDelete && <button className="min-h-10 text-xs text-muted underline underline-offset-4 hover:text-coral-dark" onClick={() => setConfirmingDelete(true)} type="button">Delete permanently</button>}
      </div>
    </div>
    <Feedback state={archiveState} />
    {editing && <GoalForm goal={goal} onDone={(saved) => { if (saved) onSaved(saved); setEditing(false); }} />}
    {confirmingDelete && <div className="mt-4 border-l-2 border-coral pl-4"><p className="text-sm text-ink">Delete this unused goal permanently? This cannot be undone.</p><div className="mt-2 flex items-center gap-4"><form action={deleteAction}><input name="goalId" type="hidden" value={goal.id} /><SubmitButton quiet>Yes, delete</SubmitButton></form><button className="min-h-10 text-sm text-muted hover:text-ink" onClick={() => setConfirmingDelete(false)} type="button">Cancel</button></div><Feedback state={deleteState} /></div>}
  </div>;
}

export function GoalManager({ goals }: { goals: Goal[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [changedGoals, setChangedGoals] = useState<Goal[]>([]);
  const saveLocally = useCallback((saved: Goal) => {
    setChangedGoals((current) => [...current.filter((goal) => goal.id !== saved.id), saved]);
    router.refresh();
  }, [router]);
  const visibleGoals = [...goals.map((goal) => changedGoals.find((changed) => changed.id === goal.id) ?? goal), ...changedGoals.filter((changed) => !goals.some((goal) => goal.id === changed.id))];
  const active = visibleGoals.filter((goal) => !goal.is_archived);
  const archived = visibleGoals.filter((goal) => goal.is_archived);
  return <section aria-labelledby="goals-heading">
    <div className="flex items-end justify-between gap-5"><div><h2 className="text-xl font-semibold tracking-[-0.025em] text-ink" id="goals-heading">Study goals</h2><p className="mt-1 text-sm text-muted">Choose what your study time is building toward.</p></div>{active.length > 0 && <button className="min-h-11 shrink-0 rounded-field border border-ink px-4 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white" onClick={() => setCreating(true)} type="button">New goal</button>}</div>
    {active.length === 0 && !creating ? <div className="mt-6 border-y border-line py-9"><p className="max-w-xl text-lg font-semibold text-ink">Begin with one clear line of study.</p><p className="mt-2 max-w-xl text-sm leading-6 text-muted">Create a goal for the exam, course, or skill you want to make time for.</p><Button className="mt-5" onClick={() => setCreating(true)}>Create your first goal</Button></div> : <div className="mt-5 border-t border-line">{active.map((goal) => <GoalRow goal={goal} key={goal.id} onSaved={saveLocally} />)}</div>}
    {creating && <GoalForm onDone={(saved) => { if (saved) saveLocally(saved); setCreating(false); }} />}
    {archived.length > 0 && <details className="mt-8 pt-4"><summary className="cursor-pointer text-sm font-semibold text-muted hover:text-ink">Archived goals ({archived.length})</summary><div className="mt-2">{archived.map((goal) => <GoalRow goal={goal} key={goal.id} onSaved={saveLocally} />)}</div></details>}
  </section>;
}
