import Link from "next/link";

type GoalProgress = {
  id: string;
  name: string;
  targetMinutes: number | null;
  trackedSeconds: number;
};

type GoalProgressSectionProps = {
  goals: GoalProgress[];
  period: "daily" | "weekly";
  title: string;
};

export function GoalProgressSection({ goals, period, title }: GoalProgressSectionProps) {
  return <section aria-labelledby={`${period}-goal-progress-heading`}>
    <div className="flex items-end justify-between gap-4">
      <h2 className="text-xl font-semibold tracking-[-0.025em] text-ink" id={`${period}-goal-progress-heading`}>{title}</h2>
      <Link className="text-sm font-semibold text-coral underline decoration-coral/30 underline-offset-4 hover:decoration-coral" href="/profile">Manage</Link>
    </div>
    {goals.length ? <div className="mt-5 border-t border-line">
      {goals.map((goal) => {
        const minutes = Math.floor(goal.trackedSeconds / 60);
        const progress = goal.targetMinutes ? Math.min(100, Math.round((minutes / goal.targetMinutes) * 100)) : null;
        return <div className="border-b border-line py-4" key={goal.id}>
          <div className="flex items-center justify-between gap-4">
            <span className="min-w-0 truncate text-sm font-semibold text-ink">{goal.name}</span>
            <span className="shrink-0 text-xs tabular text-muted">{goal.targetMinutes ? `${minutes} / ${goal.targetMinutes} min` : `${minutes} min`}</span>
          </div>
          {progress !== null && <div aria-label={`${goal.name}: ${progress}% of ${period} target`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress} className="mt-3 h-1 bg-line" role="progressbar">
            <div className="h-full bg-moss" style={{ width: `${progress}%` }} />
          </div>}
        </div>;
      })}
    </div> : <div className="mt-5 border-y border-line py-7">
      <p className="text-sm text-muted">Create a goal before starting a study session.</p>
      <Link className="mt-3 inline-block text-sm font-semibold text-coral underline decoration-coral/30 underline-offset-4" href="/profile">Create your first goal</Link>
    </div>}
  </section>;
}
