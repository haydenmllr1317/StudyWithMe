"use client";

import { useState } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { GoalManager } from "@/features/goals/goal-manager";
import type { Tables } from "@/types/database";

function Toggle({ label, description, initial = false }: { label: string; description: string; initial?: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  return <div className="flex items-center justify-between gap-5 border-b border-line py-5 last:border-b-0"><span><span className="block text-sm font-semibold text-ink">{label}</span><span className="mt-1 block max-w-lg text-xs leading-5 text-muted">{description}</span></span><button aria-label={`${enabled ? "Disable" : "Enable"} ${label}`} aria-pressed={enabled} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${enabled ? "bg-moss" : "bg-line"}`} onClick={() => setEnabled((current) => !current)} type="button"><span className={`absolute top-1 size-5 rounded-full bg-white transition-transform duration-200 ease-out ${enabled ? "translate-x-6" : "translate-x-1"}`} /></button></div>;
}

export function ProfileView({ email, goals, profile }: { email: string; goals: Tables<"study_goals">[]; profile: Tables<"profiles"> | null }) {
  const displayName = profile?.display_name ?? "StudyWithMe learner";
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "SW";
  const joined = profile ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(profile.created_at)) : null;
  return <div className="space-y-12">
    <section className="grid gap-7 border-b border-line pb-10 md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.55fr)]">
      <div className="flex items-center gap-5"><div className="grid size-16 place-items-center rounded-full bg-moss-soft text-lg font-semibold text-moss-dark">{initials}</div><div className="min-w-0"><h2 className="truncate text-2xl font-semibold tracking-[-0.03em] text-ink">{displayName}</h2>{profile ? <><p className="mt-1 truncate text-sm font-medium text-ink">@{profile.username}</p><p className="mt-1 truncate text-xs text-muted">{email} · joined {joined}</p></> : <p className="mt-2 text-sm leading-6 text-coral-dark">Your account is active, but its profile record is missing. Refresh once, then contact the project administrator if this continues.</p>}</div></div>
      <dl className="grid grid-cols-3 divide-x divide-line"><div className="pr-4"><dt className="measure-label">Week</dt><dd className="mt-2 text-lg font-semibold tabular text-ink">0m</dd></div><div className="px-4"><dt className="measure-label">Streak</dt><dd className="mt-2 text-lg font-semibold tabular text-ink">—</dd></div><div className="pl-4"><dt className="measure-label">All time</dt><dd className="mt-2 text-lg font-semibold tabular text-ink">0m</dd></div></dl>
    </section>
    <GoalManager goals={goals} />
    <section><h2 className="text-xl font-semibold tracking-[-0.025em] text-ink">Preferences</h2><div className="mt-5 border-t border-line"><Toggle description="Keep your study time visible only to approved circle members." initial label="Private circle" /><Toggle description="Prepare a quiet reminder when you are behind your daily pace." label="Pace reminders" /><Toggle description="Show session notes to people in your study circle." label="Share session notes" /></div></section>

    <section className="flex flex-col gap-5 border-t border-line pt-6 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-semibold tracking-[-0.02em] text-ink">Account session</h2><p className="mt-1 max-w-lg text-xs leading-5 text-muted">Logging out clears this browser’s Supabase session. Study totals and preferences remain illustrative until their product phases.</p></div><LogoutButton /></section>
  </div>;
}
