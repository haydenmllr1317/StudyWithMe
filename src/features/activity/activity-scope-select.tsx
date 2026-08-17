"use client";

import { useRouter } from "next/navigation";
import type { ActivityScope } from "@/lib/activity";
import type { GroupSummary } from "@/lib/groups";

export function ActivityScopeSelect({ circles, value }: { circles: GroupSummary[]; value: ActivityScope }) {
  const router = useRouter();
  return <label className="block min-w-56 text-sm font-semibold text-ink">
    <span className="sr-only">Activity audience</span>
    <select
      aria-label="Activity audience"
      className="field"
      onChange={(event) => router.push(`/activity?scope=${encodeURIComponent(event.target.value)}`)}
      value={value}
    >
      <option value="mine">My Activity</option>
      <option value="everyone">Everyone</option>
      {circles.map((circle) => <option key={circle.id} value={`circle:${circle.id}`}>{circle.name}</option>)}
    </select>
  </label>;
}
