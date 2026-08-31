"use client";

import type { GroupSummary } from "@/lib/groups";

export function ActivityDestinations({ circles, selectedIds = [] }: { circles: GroupSummary[]; selectedIds?: string[] }) {
  return <fieldset className="mt-6 border-t border-line pt-5">
    <legend className="text-sm font-semibold text-ink">Activity destinations</legend>
    <p className="mt-1 text-xs leading-5 text-muted">Your session always stays in Personal History. Share it only with the Circles you choose.</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <label className="flex min-h-12 items-center gap-3 rounded-field border border-line bg-white px-4 text-sm text-ink">
        <input checked className="size-4 accent-coral" disabled readOnly type="checkbox" />
        <span><strong className="font-semibold">Personal</strong><span className="ml-1 text-xs text-muted">Always included</span></span>
      </label>
      {circles.map((circle) => <label className="flex min-h-12 items-center gap-3 rounded-field border border-line bg-white px-4 text-sm text-ink transition-colors has-[:checked]:border-moss has-[:checked]:bg-moss/5" key={circle.id}>
        <input className="size-4 accent-moss" defaultChecked={selectedIds.includes(circle.id)} name="activityCircleIds" type="checkbox" value={circle.id} />
        <span className="min-w-0 truncate font-semibold">{circle.name}</span>
      </label>)}
    </div>
    {!circles.length && <p className="mt-3 text-xs text-muted">Join or create a Circle to share this session socially.</p>}
  </fieldset>;
}
