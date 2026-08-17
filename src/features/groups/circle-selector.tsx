"use client";

import { useRouter } from "next/navigation";
import type { GroupSummary } from "@/lib/groups";

export function CircleSelector({ circles, range, selectedId }: { circles: GroupSummary[]; range?: string; selectedId?: string }) {
  const router = useRouter();
  if (!circles.length) return null;
  return <label className="block min-w-56 text-sm font-semibold text-ink">
    <span className="sr-only">Current Circle</span>
    <select aria-label="Leaderboard population" className="field" onChange={(event) => router.push(event.target.value === "everyone" ? `/leaderboard${range ? `?range=${encodeURIComponent(range)}` : ""}` : `/groups/${event.target.value}${range ? `?range=${encodeURIComponent(range)}` : ""}`)} value={selectedId ?? "everyone"}>
      <option value="everyone">Everyone</option>
      {circles.map((circle) => <option key={circle.id} value={circle.id}>{circle.name}</option>)}
    </select>
  </label>;
}
