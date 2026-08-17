import { LogoutButton } from "@/components/auth/logout-button";
import { GoalManager } from "@/features/goals/goal-manager";
import { AvatarUpload } from "@/features/profile/avatar-upload";
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
  const joined = profile
    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: profile.timezone }).format(new Date(profile.created_at))
    : null;

  return <div className="space-y-12">
    <section className="grid gap-7 border-b border-line pb-10 md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.55fr)]">
      <div className="flex items-center gap-5">
        <AvatarUpload avatarPath={profile?.avatar_url ?? null} displayName={displayName ?? "StudyWithMe learner"} />
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
    <div className="flex justify-center"><LogoutButton /></div>
  </div>;
}
