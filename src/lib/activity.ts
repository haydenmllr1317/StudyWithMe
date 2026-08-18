import type { Json } from "@/types/database";
import type { GroupSummary } from "@/lib/groups";

export type ActivityScope = "mine" | "all_circles" | `circle:${string}`;
export type ActivityItem = {
  id: string;
  displayName: string;
  username: string;
  goalName: string;
  durationSeconds: number;
  completedAt: string;
  rating: number | null;
  sharedNotes: string | null;
  circleId: string | null;
  circleName: string | null;
  reflectionPhotoPath: string | null;
  reflectionPhotoUrl?: string | null;
  loveCount: number;
  isLoved: boolean;
  canLove: boolean;
  isCurrentUser: boolean;
};
export type ActivityFeed = {
  items: ActivityItem[];
  timezone: string;
  nextCursor: { endedAt: string; id: string } | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseActivityScope(value: unknown): ActivityScope {
  if (value === "mine" || value === "all_circles") return value;
  if (typeof value === "string" && value.startsWith("circle:") && uuidPattern.test(value.slice(7))) return value as ActivityScope;
  return "all_circles";
}

export function activityScopeAllowed(scope: ActivityScope, circles: GroupSummary[]) {
  return !scope.startsWith("circle:") || circles.some((circle) => circle.id === scope.slice(7));
}

export function parseActivityFeed(value: Json | null): ActivityFeed | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const record = value as Record<string, Json | undefined>;
  if (!Array.isArray(record.items) || typeof record.timezone !== "string") return null;
  const items = record.items.flatMap((entry) => {
    if (!entry || Array.isArray(entry) || typeof entry !== "object") return [];
    const item = entry as Record<string, Json | undefined>;
    const durationSeconds = Number(item.durationSeconds);
    const rating = item.rating === null ? null : Number(item.rating);
    if (
      typeof item.id !== "string" || !uuidPattern.test(item.id) ||
      typeof item.displayName !== "string" || typeof item.username !== "string" ||
      typeof item.goalName !== "string" || typeof item.completedAt !== "string" ||
      !Number.isFinite(durationSeconds) || durationSeconds <= 0 ||
      (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5))
    ) return [];
    return [{
      id: item.id,
      displayName: item.displayName,
      username: item.username,
      goalName: item.goalName,
      durationSeconds,
      completedAt: item.completedAt,
      rating,
      sharedNotes: typeof item.sharedNotes === "string" ? item.sharedNotes : null,
      circleId: typeof item.circleId === "string" ? item.circleId : null,
      circleName: typeof item.circleName === "string" ? item.circleName : null,
      reflectionPhotoPath: typeof item.reflectionPhotoPath === "string" ? item.reflectionPhotoPath : null,
      loveCount: Math.max(0, Number(item.loveCount) || 0),
      isLoved: item.isLoved === true,
      canLove: item.canLove === true,
      isCurrentUser: item.isCurrentUser === true,
    }];
  });
  const cursorValue = record.nextCursor;
  const cursor = cursorValue && !Array.isArray(cursorValue) && typeof cursorValue === "object"
    ? cursorValue as Record<string, Json | undefined>
    : null;
  const nextCursor = cursor && typeof cursor.endedAt === "string" && typeof cursor.id === "string" && uuidPattern.test(cursor.id)
    ? { endedAt: cursor.endedAt, id: cursor.id }
    : null;
  return { items, timezone: record.timezone, nextCursor };
}

export function parseActivityCursor(before: unknown, beforeId: unknown) {
  if (typeof before !== "string" || Number.isNaN(Date.parse(before)) || typeof beforeId !== "string" || !uuidPattern.test(beforeId)) {
    return { before: undefined, beforeId: undefined };
  }
  return { before: new Date(before).toISOString(), beforeId };
}
