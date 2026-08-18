import type { Json } from "@/types/database";

export const analyticsRanges = ["7d", "30d", "3m", "6m", "1y", "all"] as const;
export type AnalyticsRange = (typeof analyticsRanges)[number];
export type AnalyticsPoint = { date: string; seconds: number };
export type AnalyticsGoal = { name: string; seconds: number };
export type AnalyticsRanking = { displayName: string; username: string; avatarPath: string | null; durationSeconds: number; rank: number | null; isCurrentUser: boolean };
export type AnalyticsMember = { userId: string; displayName: string; username: string; durationSeconds: number; isCurrentUser: boolean; daily: AnalyticsPoint[] };
export type AnalyticsData = { range: AnalyticsRange; scope: "mine" | "everyone" | "circle"; timezone: string; totalSeconds: number; daily: AnalyticsPoint[]; goals: AnalyticsGoal[]; leaderboard: AnalyticsRanking[]; members: AnalyticsMember[] };

export function parseAnalyticsRange(value: string | string[] | undefined): AnalyticsRange {
  return typeof value === "string" && analyticsRanges.includes(value as AnalyticsRange) ? value as AnalyticsRange : "30d";
}

export function analyticsRangeLabel(range: AnalyticsRange) {
  return { "7d": "7 days", "30d": "30 days", "3m": "3 months", "6m": "6 months", "1y": "1 year", all: "All time" }[range];
}

const nonnegative = (value: unknown) => Math.max(0, Number(value) || 0);

export function parseAnalyticsData(value: Json | null): AnalyticsData | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const raw = value as Record<string, Json | undefined>;
  const scope = raw.scope === "everyone" || raw.scope === "circle" ? raw.scope : "mine";
  const daily = Array.isArray(raw.daily) ? raw.daily.flatMap((entry) => {
    if (!entry || Array.isArray(entry) || typeof entry !== "object" || typeof entry.date !== "string") return [];
    return [{ date: entry.date, seconds: nonnegative(entry.seconds) }];
  }) : [];
  const goals = Array.isArray(raw.goals) ? raw.goals.flatMap((entry) => {
    if (!entry || Array.isArray(entry) || typeof entry !== "object" || typeof entry.name !== "string") return [];
    return [{ name: entry.name, seconds: nonnegative(entry.seconds) }];
  }) : [];
  const leaderboard = Array.isArray(raw.leaderboard) ? raw.leaderboard.flatMap((entry) => {
    if (!entry || Array.isArray(entry) || typeof entry !== "object" || typeof entry.username !== "string") return [];
    return [{ displayName: typeof entry.displayName === "string" ? entry.displayName : entry.username, username: entry.username, avatarPath: typeof entry.avatarPath === "string" ? entry.avatarPath : null, durationSeconds: nonnegative(entry.durationSeconds), rank: typeof entry.rank === "number" ? entry.rank : null, isCurrentUser: entry.isCurrentUser === true }];
  }) : [];
  const members = Array.isArray(raw.members) ? raw.members.flatMap((entry) => {
    if (!entry || Array.isArray(entry) || typeof entry !== "object") return [];
    const member = entry as Record<string, Json | undefined>;
    if (typeof member.userId !== "string" || typeof member.username !== "string") return [];
    const memberDaily = Array.isArray(member.daily) ? member.daily.flatMap((point) => {
      if (!point || Array.isArray(point) || typeof point !== "object" || typeof point.date !== "string") return [];
      return [{ date: point.date, seconds: nonnegative(point.seconds) }];
    }) : [];
    return [{ userId: member.userId, displayName: typeof member.displayName === "string" ? member.displayName : member.username, username: member.username, durationSeconds: nonnegative(member.durationSeconds), isCurrentUser: member.isCurrentUser === true, daily: memberDaily }];
  }) : [];
  return { range: parseAnalyticsRange(typeof raw.range === "string" ? raw.range : undefined), scope, timezone: typeof raw.timezone === "string" ? raw.timezone : "UTC", totalSeconds: nonnegative(raw.totalSeconds), daily, goals, leaderboard, members };
}
