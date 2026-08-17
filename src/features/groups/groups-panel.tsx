import Link from "next/link";
import { CreateGroupForm } from "@/features/groups/group-forms";
import type { GroupSummary } from "@/lib/groups";

export function GroupsPanel({ groups, error = false }: { groups: GroupSummary[]; error?: boolean }) {
  return <section className="border-t border-line pt-8"><div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
    <div>
      <h2 className="text-xl font-semibold tracking-[-0.025em] text-ink">Your Circles</h2>
      {error ? <p className="mt-5 border-y border-line py-5 text-sm text-muted" role="alert">Your Circles could not be loaded. Refresh to try again.</p> : groups.length ? <ul className="mt-5 border-t border-line">{groups.map((circle) => <li className="border-b border-line" key={circle.id}><Link className="grid min-h-16 grid-cols-[1fr_auto] items-center gap-4 py-3" href={`/groups/${circle.id}`}><span><strong className="block text-sm text-ink">{circle.name}</strong><span className="mt-1 block text-xs text-muted">{circle.role === "owner" ? "Owner" : "Member"} · {circle.memberCount} {circle.memberCount === 1 ? "learner" : "learners"}</span></span><span className="text-sm font-semibold text-coral">Open</span></Link></li>)}</ul> : <p className="mt-5 border-y border-line py-5 text-sm text-muted">You have not joined a Circle yet.</p>}
    </div>
    <div className="lg:border-l lg:border-line lg:pl-8"><h2 className="text-lg font-semibold text-ink">Create a Circle</h2><div className="mt-5"><CreateGroupForm /></div></div>
  </div></section>;
}
