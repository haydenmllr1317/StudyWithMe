import { LogoutButton } from "@/components/auth/logout-button";
import { GoalManager } from "@/features/goals/goal-manager";
import { formatDuration } from "@/lib/sessions/format";
import type { Json, Tables } from "@/types/database";

function numberField(value: Json | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function ProfileView({ email, goals, profile, stats }: {
  email: string;
  goals: Tables<"study_goals">[];
  profile: Tables<"profiles"> | null;
  stats: Json | null;
}) {
  const hasStats = Boolean(stats && !Array.isArray(stats) && typeof stats === "object");
  const values = hasStats ? stats as Record<string, Json | undefined> : {};
  const displayName = profile?.display_name;
  const initials = displayName
    ? displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")
    : "?";
  const joined = profile
    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(profile.created_at))
    : null;

  return <div className="space-y-12">
    <section className="grid gap-7 border-b border-line pb-10 md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.55fr)]">
      <div className="flex items-center gap-5">
        <div className="grid size-16 place-items-center rounded-full bg-moss-soft text-lg font-semibold text-moss-dark">{initials}</div>
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-semibold tracking-[-0.03em] text-ink">{displayName ?? "Profile unavailable"}</h2>
          {profile ? <>
            <p className="mt-1 truncate text-sm font-medium text-ink">@{profile.username}</p>
            <p className="mt-1 truncate text-xs text-muted">{email} · joined {joined}</p>
          </> : <p className="mt-2 text-sm leading-6 text-coral-dark">Your account is active, but its profile record is missing. Refresh once, then contact the project administrator if this continues.</p>}
        </div>
      </div>
      <dl className="grid grid-cols-3 divide-x divide-line">
        <div className="pr-4"><dt className="measure-label">Week</dt><dd className="mt-2 text-lg font-semibold tabular text-ink">{hasStats ? formatDuration(numberField(values.week)) : "—"}</dd></div>
        <div className="px-4"><dt className="measure-label">Streak</dt><dd className="mt-2 text-lg font-semibold tabular text-ink">{hasStats ? `${numberField(values.streak)} days` : "—"}</dd></div>
        <div className="pl-4"><dt className="measure-label">All time</dt><dd className="mt-2 text-lg font-semibold tabular text-ink">{hasStats ? formatDuration(numberField(values.allTime)) : "—"}</dd></div>
      </dl>
    </section>
    <GoalManager goals={goals} />
    <section className="flex flex-col gap-5 border-t border-line pt-6 sm:flex-row sm:items-start sm:justify-between">
      <h2 className="text-lg font-semibold tracking-[-0.02em] text-ink">Account</h2>
      <LogoutButton />
    </section>
  </div>;
}
