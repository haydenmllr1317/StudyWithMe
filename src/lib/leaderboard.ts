import type { Json } from "@/types/database";

export const leaderboardPeriods = ["today", "week", "month", "all"] as const;
export type LeaderboardPeriod = (typeof leaderboardPeriods)[number];
export type LeaderboardEntry = { displayName: string; username: string; durationSeconds: number; rank: number; isCurrentUser: boolean };
export type CurrentLeaderboardUser = Omit<LeaderboardEntry, "isCurrentUser" | "rank"> & { rank: number | null; includedInTop: boolean };
export type LeaderboardData = { period: LeaderboardPeriod; timezone: string; totalParticipants: number; top: LeaderboardEntry[]; currentUser: CurrentLeaderboardUser | null };

export function parseLeaderboardPeriod(value: string | string[] | undefined): LeaderboardPeriod {
  return typeof value === "string" && leaderboardPeriods.includes(value as LeaderboardPeriod) ? value as LeaderboardPeriod : "week";
}

export function parseLeaderboardData(value: Json | null): LeaderboardData | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const raw = value as Record<string, Json | undefined>;
  const readEntry = (entry: Json, current = false): LeaderboardEntry | CurrentLeaderboardUser | null => {
    if (!entry || Array.isArray(entry) || typeof entry !== "object") return null;
    const item = entry as Record<string, Json | undefined>;
    if (typeof item.username !== "string") return null;
    const base = { displayName: typeof item.displayName === "string" && item.displayName.trim() ? item.displayName : item.username, username: item.username, durationSeconds: Math.max(0, Number(item.durationSeconds) || 0) };
    if (current) return { ...base, rank: typeof item.rank === "number" ? item.rank : null, includedInTop: item.includedInTop === true };
    return { ...base, rank: Math.max(1, Number(item.rank) || 1), isCurrentUser: item.isCurrentUser === true };
  };
  const top = Array.isArray(raw.top) ? raw.top.map((item) => readEntry(item)).filter((item): item is LeaderboardEntry => item !== null && "isCurrentUser" in item) : [];
  const currentUser = readEntry(raw.currentUser ?? null, true);
  return { period: parseLeaderboardPeriod(typeof raw.period === "string" ? raw.period : undefined), timezone: typeof raw.timezone === "string" ? raw.timezone : "UTC", totalParticipants: Math.max(0, Number(raw.totalParticipants) || 0), top, currentUser: currentUser && "includedInTop" in currentUser ? currentUser : null };
}

export function leaderboardPeriodLabel(period: LeaderboardPeriod) {
  return { today: "Today", week: "Week", month: "Month", all: "All time" }[period];
}
